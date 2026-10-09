from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.db.models import Count, F, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import NotAuthenticated, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from marketplace.models import (
    CartItem,
    Category,
    ContentPost,
    DeliveryZone,
    Order,
    OrderItem,
    Payment,
    Product,
    ProductReview,
    Seller,
    SupportTicket,
    UserProfile,
    WishlistItem,
)
from marketplace.permissions import ProductPermissions
from marketplace.serializers import (
    CartItemSerializer,
    CategorySerializer,
    ContentPostSerializer,
    CurrentUserSerializer,
    DeliveryZoneSerializer,
    OrderSerializer,
    PaymentSerializer,
    ProductReviewSerializer,
    ProductSerializer,
    SellerPublicSerializer,
    SupportTicketSerializer,
    WishlistItemSerializer,
)

User = get_user_model()


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return Response({"status": "ok", "database": "connected"})
        except Exception:
            return Response(
                {"status": "error", "database": "unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)

    def patch(self, request):
        allowed = {"first_name", "last_name"}
        updates = {key: request.data.get(key) for key in allowed if key in request.data}
        profile = UserProfile.objects.filter(user=request.user).first()
        phone = request.data.get("phone")
        if phone is not None:
            if not profile:
                profile = UserProfile.objects.create(user=request.user)
            profile.phone = str(phone).strip()[:32]
            profile.save(update_fields=["phone", "updated_at"])
        for field, value in updates.items():
            setattr(request.user, field, str(value).strip()[:150])
        if updates:
            request.user.save(update_fields=list(updates.keys()))
        return Response(CurrentUserSerializer(request.user).data)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [ProductPermissions]
    search_fields = ["name", "description", "sku"]
    ordering_fields = ["created_at", "price_rwf", "name", "stock_quantity"]
    ordering = ["-is_featured", "-created_at"]

    def get_queryset(self):
        queryset = Product.objects.select_related("seller", "category")
        if not (self.request.user.is_authenticated and (self.request.user.is_staff or self.request.user.is_superuser)):
            queryset = queryset.filter(
                is_active=True,
                seller__status=Seller.Status.APPROVED,
                seller__owner__is_active=True,
            )
        category = self.request.query_params.get("category")
        seller_slug = self.request.query_params.get("seller")
        featured = self.request.query_params.get("featured")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        if category:
            queryset = queryset.filter(category__slug=category)
        if seller_slug:
            queryset = queryset.filter(seller__slug=seller_slug)
        if featured in {"true", "1"}:
            queryset = queryset.filter(is_featured=True)
        if min_price:
            try:
                queryset = queryset.filter(price_rwf__gte=Decimal(min_price))
            except Exception:
                raise ValidationError({"min_price": "Enter a valid price."})
        if max_price:
            try:
                queryset = queryset.filter(price_rwf__lte=Decimal(max_price))
            except Exception:
                raise ValidationError({"max_price": "Enter a valid price."})
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            seller_id = serializer.validated_data.get("seller_id") or self.request.data.get("seller_id")
            if not seller_id:
                raise ValidationError({"seller_id": "Admin must provide the seller id."})
            seller = get_object_or_404(Seller, pk=seller_id)
        else:
            seller = Seller.objects.filter(owner=user, status=Seller.Status.APPROVED).first()
            if not seller:
                raise PermissionDenied("An approved seller account is required to create products.")
        serializer.save(seller=seller)

    def perform_update(self, serializer):
        product = self.get_object()
        if not self.request.user.is_staff and not self.request.user.is_superuser:
            try:
                seller = self.request.user.marketplace_seller
            except Seller.DoesNotExist:
                seller = None
            if not seller or seller.id != product.seller_id or seller.status != Seller.Status.APPROVED:
                raise PermissionDenied("You may only edit products belonging to your approved seller account.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.is_staff and not self.request.user.is_superuser:
            try:
                seller = self.request.user.marketplace_seller
            except Seller.DoesNotExist:
                seller = None
            if not seller or seller.id != instance.seller_id:
                raise PermissionDenied("You may only remove your own products.")
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class PublicCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    queryset = Category.objects.filter(is_active=True)


class PublicSellerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SellerPublicSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Seller.objects.filter(
            status=Seller.Status.APPROVED,
            owner__is_active=True,
        ).annotate(product_count=Count("products", filter=Q(products__is_active=True)))


class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return CartItem.objects.filter(user=self.request.user).select_related(
            "product", "product__seller", "product__category"
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data.get("quantity", 1)
        if product.stock_quantity < quantity:
            raise ValidationError({"quantity": "Requested quantity is greater than available stock."})
        with transaction.atomic():
            item, created = CartItem.objects.get_or_create(
                user=request.user,
                product=product,
                defaults={"quantity": quantity},
            )
            if not created:
                next_quantity = item.quantity + quantity
                if next_quantity > product.stock_quantity:
                    raise ValidationError({"quantity": "Requested quantity is greater than available stock."})
                item.quantity = next_quantity
                item.save(update_fields=["quantity", "updated_at"])
        return Response(
            self.get_serializer(item).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def perform_update(self, serializer):
        product = serializer.instance.product
        quantity = serializer.validated_data.get("quantity", serializer.instance.quantity)
        if quantity > product.stock_quantity:
            raise ValidationError({"quantity": "Requested quantity is greater than available stock."})
        serializer.save()


class WishlistItemViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistItemSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options]

    def get_queryset(self):
        return WishlistItem.objects.filter(user=self.request.user).select_related(
            "product", "product__seller", "product__category"
        )

    def perform_create(self, serializer):
        product = serializer.validated_data["product"]
        item, _ = WishlistItem.objects.get_or_create(user=self.request.user, product=product)
        serializer.instance = item


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        name = str(data.get("customer_name") or f"{request.user.first_name} {request.user.last_name}").strip()
        phone = str(data.get("customer_phone") or "").strip()
        address = str(data.get("delivery_address") or "").strip()
        email = str(data.get("customer_email") or request.user.email or "").strip()
        payment_method = str(data.get("payment_method") or Order.PaymentMethod.COD).lower()
        if not name:
            raise ValidationError({"customer_name": "Customer name is required."})
        if not phone:
            raise ValidationError({"customer_phone": "A contact phone number is required."})
        if not address:
            raise ValidationError({"delivery_address": "A delivery address is required."})
        if payment_method != Order.PaymentMethod.COD:
            raise ValidationError({"payment_method": "Online payment is not configured yet. Choose cash on delivery."})

        zone = None
        zone_id = data.get("delivery_zone_id")
        if zone_id:
            zone = DeliveryZone.objects.filter(pk=zone_id, is_active=True).first()
            if not zone:
                raise ValidationError({"delivery_zone_id": "Select an active delivery zone."})

        with transaction.atomic():
            cart_items = list(
                CartItem.objects.filter(user=request.user)
                .select_related("product", "product__seller")
                .order_by("id")
            )
            if not cart_items:
                raise ValidationError({"cart": "Your cart is empty."})

            prepared = []
            subtotal = Decimal("0")
            for cart_item in cart_items:
                product = Product.objects.select_for_update().select_related("seller").get(pk=cart_item.product_id)
                if not product.is_active or product.seller.status != Seller.Status.APPROVED:
                    raise ValidationError({"cart": f"{product.name} is no longer available."})
                if cart_item.quantity > product.stock_quantity:
                    raise ValidationError({"cart": f"Only {product.stock_quantity} units of {product.name} are available."})
                line_total = product.price_rwf * cart_item.quantity
                subtotal += line_total
                prepared.append((product, cart_item.quantity, line_total))

            delivery_fee = zone.fee_rwf if zone else Decimal("0")
            order = Order.objects.create(
                customer=request.user,
                customer_name=name,
                customer_email=email,
                customer_phone=phone,
                delivery_address=address,
                delivery_zone=zone,
                notes=str(data.get("notes") or "").strip()[:2000],
                payment_method=payment_method,
                subtotal_rwf=subtotal,
                delivery_fee_rwf=delivery_fee,
                total_rwf=subtotal + delivery_fee,
            )
            for product, quantity, line_total in prepared:
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    seller=product.seller,
                    product_name=product.name,
                    unit_price_rwf=product.price_rwf,
                    quantity=quantity,
                    line_total_rwf=line_total,
                )
                product.stock_quantity -= quantity
                product.save(update_fields=["stock_quantity", "updated_at"])
            Payment.objects.create(
                order=order,
                method=payment_method,
                status=Payment.Status.PENDING,
                amount_rwf=order.total_rwf,
            )
            CartItem.objects.filter(user=request.user).delete()

        order = Order.objects.prefetch_related("items").select_related("delivery_zone", "payment").get(pk=order.pk)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "order_number"

    def get_queryset(self):
        queryset = Order.objects.prefetch_related("items").select_related("delivery_zone", "payment")
        if self.request.user.is_staff or self.request.user.is_superuser:
            return queryset
        return queryset.filter(customer=self.request.user)


class ProductReviewViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = ProductReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = ProductReview.objects.filter(
            status=ProductReview.Status.PUBLISHED,
            product__is_active=True,
            product__seller__status=Seller.Status.APPROVED,
        ).select_related("product", "customer")
        product_id = self.request.query_params.get("product")
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            raise NotAuthenticated("Sign in to submit a review.")
        serializer.save(customer=self.request.user, status=ProductReview.Status.PENDING)


class SupportTicketViewSet(viewsets.ModelViewSet):
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return SupportTicket.objects.filter(customer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class DeliveryZoneViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DeliveryZoneSerializer
    permission_classes = [AllowAny]
    queryset = DeliveryZone.objects.filter(is_active=True)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Payment.objects.select_related("order")
        if self.request.user.is_staff or self.request.user.is_superuser:
            return queryset
        return queryset.filter(order__customer=self.request.user)


class ContentPostViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContentPostSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        queryset = ContentPost.objects.all()
        if not (self.request.user.is_authenticated and (self.request.user.is_staff or self.request.user.is_superuser)):
            queryset = queryset.filter(status=ContentPost.Status.PUBLISHED)
        return queryset


class SellerDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        seller = Seller.objects.filter(owner=request.user).first()
        if not seller:
            raise PermissionDenied("This account is not registered as a seller.")
        if seller.status != Seller.Status.APPROVED:
            return Response({"seller_status": seller.status, "message": "Seller approval is required."}, status=403)
        products = Product.objects.filter(seller=seller)
        items = OrderItem.objects.filter(
            seller=seller,
            order__status__in=[
                Order.Status.CONFIRMED, Order.Status.PROCESSING, Order.Status.SHIPPED, Order.Status.DELIVERED,
            ],
        )
        revenue = items.aggregate(total=Sum(F("quantity") * F("unit_price_rwf")))["total"] or Decimal("0")
        return Response({
            "seller": {"id": seller.id, "business_name": seller.business_name, "slug": seller.slug},
            "products_count": products.count(),
            "active_products_count": products.filter(is_active=True).count(),
            "low_stock_count": products.filter(is_active=True, stock_quantity__lte=5).count(),
            "orders_count": items.values("order_id").distinct().count(),
            "units_sold": items.aggregate(total=Sum("quantity"))["total"] or 0,
            "revenue_rwf": revenue,
        })


class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            "customers_count": User.objects.filter(is_staff=False, is_superuser=False).count(),
            "sellers_count": Seller.objects.count(),
            "pending_sellers_count": Seller.objects.filter(status=Seller.Status.PENDING).count(),
            "active_products_count": Product.objects.filter(is_active=True).count(),
            "orders_count": Order.objects.count(),
            "pending_orders_count": Order.objects.filter(status=Order.Status.PENDING).count(),
            "paid_total_rwf": Payment.objects.filter(status=Payment.Status.PAID).aggregate(total=Sum("amount_rwf"))["total"] or Decimal("0"),
            "open_support_tickets_count": SupportTicket.objects.filter(status__in=[SupportTicket.Status.OPEN, SupportTicket.Status.IN_PROGRESS]).count(),
        })
