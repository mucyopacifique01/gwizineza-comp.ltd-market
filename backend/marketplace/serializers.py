from django.contrib.auth import get_user_model
from django.utils.text import slugify
from rest_framework import serializers

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

User = get_user_model()


class CurrentUserSerializer(serializers.ModelSerializer):
    phone = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "phone", "role", "date_joined"]
        read_only_fields = fields

    def get_phone(self, obj):
        try:
            return obj.marketplace_profile.phone
        except UserProfile.DoesNotExist:
            return ""

    def get_role(self, obj):
        if obj.is_staff or obj.is_superuser:
            return "admin"
        try:
            return obj.marketplace_profile.role
        except UserProfile.DoesNotExist:
            return "customer"


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "sort_order"]


class SellerSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Seller
        fields = ["id", "business_name", "slug", "city", "description"]


class SellerPublicSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Seller
        fields = ["id", "business_name", "slug", "phone", "address", "city", "description", "product_count"]
        read_only_fields = fields


class ProductSerializer(serializers.ModelSerializer):
    seller = SellerSummarySerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.filter(is_active=True),
        write_only=True,
        required=False,
        allow_null=True,
    )
    slug = serializers.SlugField(required=False, allow_blank=True)
    seller_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "sku", "price_rwf", "compare_at_price_rwf",
            "stock_quantity", "image_url", "is_featured", "is_active", "category", "category_id",
            "seller", "seller_id", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "seller"]

    def validate_price_rwf(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate(self, attrs):
        compare = attrs.get("compare_at_price_rwf")
        price = attrs.get("price_rwf", getattr(self.instance, "price_rwf", None))
        if compare is not None and price is not None and compare < price:
            raise serializers.ValidationError({
                "compare_at_price_rwf": "Compare-at price must be greater than or equal to the selling price."
            })
        if self.instance is None and not attrs.get("slug"):
            attrs["slug"] = slugify(attrs.get("name", ""))
        return attrs

    def create(self, validated_data):
        validated_data.pop("seller_id", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("seller_id", None)
        return super().update(instance, validated_data)


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.filter(is_active=True, seller__status=Seller.Status.APPROVED),
        write_only=True,
        required=True,
    )

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_id", "quantity", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.filter(is_active=True, seller__status=Seller.Status.APPROVED),
        write_only=True,
    )

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "product_id", "created_at"]
        read_only_fields = ["id", "created_at"]


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "seller", "product_name", "unit_price_rwf", "quantity", "line_total_rwf"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "method", "status", "amount_rwf", "provider_reference", "created_at", "updated_at"]
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)
    delivery_zone_name = serializers.CharField(source="delivery_zone.name", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "customer_name", "customer_email", "customer_phone",
            "delivery_address", "delivery_zone", "delivery_zone_name", "notes", "status",
            "payment_method", "payment_status", "subtotal_rwf", "delivery_fee_rwf", "total_rwf",
            "items", "payment", "created_at", "updated_at",
        ]
        read_only_fields = fields


class ProductReviewSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True, seller__status=Seller.Status.APPROVED)
    )
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = ["id", "product", "customer_name", "rating", "title", "body", "created_at"]
        read_only_fields = ["id", "customer_name", "created_at"]

    def get_customer_name(self, obj):
        return obj.customer.first_name or "Verified customer"

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class SupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ["id", "subject", "message", "status", "priority", "staff_response", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "priority", "staff_response", "created_at", "updated_at"]


class DeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = ["id", "name", "areas", "fee_rwf", "estimated_days"]
        read_only_fields = fields


class ContentPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentPost
        fields = ["id", "title", "slug", "excerpt", "body", "published_at", "created_at"]
        read_only_fields = fields
