import base64
import hashlib
import hmac
import json
import re
import time
import uuid
from datetime import timedelta
from urllib.parse import quote

import requests
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.db import IntegrityError, connection, transaction
from django.db.models import Count, Q, Sum
from django.http import JsonResponse
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt

from .models import (
    AuditLog, Cart, CartItem, Category, ContentPost, CustomerProfile,
    DeliveryZone, Order, OrderItem, Payment, Product, ProductImage,
    ProductReview, Seller, SiteSettings, SupportTicket, WishlistItem,
)


class ApiError(Exception):
    def __init__(self, message, status=400):
        self.message = message
        self.status = status


def result(data, status=200):
    return JsonResponse(data, status=status, safe=not isinstance(data, (list, tuple)))


def fail(message, status=400):
    return result({"error": message}, status)


def body_json(request):
    try:
        value = json.loads(request.body or b"{}")
        return value if isinstance(value, dict) else {}
    except (ValueError, TypeError):
        return {}


def clean(value, maximum=500):
    return value.strip()[:maximum] if isinstance(value, str) else ""


def as_uuid(value):
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None


def iso(value):
    return value.isoformat() if value else None


def _admin_claims(request):
    token = request.COOKIES.get("gwizineza_admin_session", "")
    if not token:
        return None
    try:
        data = signing.loads(token, salt="gwizineza-admin", max_age=12 * 60 * 60)
        return data if data.get("admin") is True else None
    except signing.BadSignature:
        return None


def require_admin(request):
    if not _admin_claims(request):
        raise ApiError("Admin authentication required", 401)


def _seller_claims(request):
    token = request.COOKIES.get("gwizineza_seller_session", "")
    if not token:
        return None
    try:
        data = signing.loads(token, salt="gwizineza-seller", max_age=24 * 60 * 60)
        seller_id = as_uuid(data.get("seller_id"))
        if not seller_id:
            return None
        seller = Seller.objects.filter(id=seller_id, status=Seller.Status.APPROVED).first()
        return seller
    except signing.BadSignature:
        return None


def require_seller(request):
    seller = _seller_claims(request)
    if not seller:
        raise ApiError("Approved seller authentication required", 401)
    return seller


def supabase_user(request):
    """Validate the Supabase access token through the official Auth user endpoint."""
    if hasattr(request, "_supabase_user"):
        return request._supabase_user
    request._supabase_user = None
    token = request.headers.get("Authorization", "")
    if not token.lower().startswith("bearer ") or not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        return None
    try:
        response = requests.get(
            settings.SUPABASE_URL.rstrip("/") + "/auth/v1/user",
            headers={
                "Authorization": token,
                "apikey": settings.SUPABASE_ANON_KEY,
            },
            timeout=6,
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("id"):
                request._supabase_user = data
    except (requests.RequestException, ValueError):
        return None
    return request._supabase_user


def require_customer(request):
    user = supabase_user(request)
    if not user:
        raise ApiError("Sign in with your email or phone OTP to continue", 401)
    customer_id = as_uuid(user.get("id"))
    if not customer_id:
        raise ApiError("Invalid Supabase user identity", 401)
    metadata = user.get("user_metadata") or {}
    defaults = {
        "name": clean(metadata.get("full_name") or metadata.get("name") or "", 160),
        "email": clean(user.get("email") or "", 254) or None,
        "phone": clean(user.get("phone") or "", 32) or None,
        "avatar_url": clean(metadata.get("avatar_url") or "", 600) or None,
    }
    profile, created = CustomerProfile.objects.get_or_create(id=customer_id, defaults=defaults)
    if not created:
        changed = []
        for field, value in defaults.items():
            if value and getattr(profile, field) != value:
                setattr(profile, field, value)
                changed.append(field)
        if changed:
            profile.save(update_fields=changed + ["updated_at"])
    request._customer_profile = profile
    return profile


def category_json(category):
    if not category:
        return None
    return {"id": str(category.id), "name": category.name, "slug": category.slug}


def seller_json(seller, include_admin=False):
    if not seller:
        return None
    data = {
        "id": str(seller.id),
        "businessName": seller.business_name,
        "address": seller.address,
    }
    if include_admin:
        data.update({
            "ownerName": seller.owner_name,
            "phone": seller.phone,
            "email": seller.email,
            "loginUsername": seller.login_username,
            "status": seller.status,
            "createdAt": iso(seller.created_at),
            "updatedAt": iso(seller.updated_at),
            "_count": {"products": seller.products.count()},
        })
    return data


def product_json(product, include_private=False):
    images = list(product.images.all())
    data = {
        "id": str(product.id),
        "sku": product.sku,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "priceRwf": product.price_rwf,
        "compareAtPriceRwf": product.compare_at_price_rwf,
        "stock": product.stock,
        "imageUrl": product.image_url,
        "isActive": product.is_active,
        "isFeatured": product.is_featured,
        "displaySection": product.display_section,
        "displayPriority": product.display_priority,
        "createdAt": iso(product.created_at),
        "updatedAt": iso(product.updated_at),
        "category": category_json(product.category),
        "seller": seller_json(product.seller, include_admin=include_private),
        "images": [{
            "id": str(image.id), "url": image.url, "altText": image.alt_text,
            "isPrimary": image.is_primary, "sortOrder": image.sort_order,
        } for image in images],
    }
    if include_private:
        data["sellerId"] = str(product.seller_id) if product.seller_id else None
        data["categoryId"] = str(product.category_id) if product.category_id else None
    return data


def product_queryset(include_inactive=False):
    qs = Product.objects.select_related("category", "seller").prefetch_related("images")
    if not include_inactive:
        qs = qs.filter(is_active=True).filter(Q(seller__isnull=True) | Q(seller__status=Seller.Status.APPROVED))
    return qs


def order_json(order, include_private=False):
    items = []
    for item in order.items.select_related("product", "seller").all():
        items.append({
            "id": str(item.id),
            "productId": str(item.product_id),
            "productName": item.product_name,
            "unitPriceRwf": item.unit_price_rwf,
            "quantity": item.quantity,
            "lineTotalRwf": item.line_total_rwf,
            "imageUrl": item.product.image_url,
            "slug": item.product.slug,
            "sellerId": str(item.seller_id) if item.seller_id else None,
        })
    data = {
        "id": str(order.id),
        "orderNumber": order.order_number,
        "status": order.status,
        "customerName": order.customer_name,
        "phone": order.phone,
        "customerEmail": order.customer_email,
        "deliveryAddress": order.delivery_address,
        "subtotalRwf": order.subtotal_rwf,
        "deliveryRwf": order.delivery_rwf,
        "totalRwf": order.total_rwf,
        "currency": order.currency,
        "createdAt": iso(order.created_at),
        "updatedAt": iso(order.updated_at),
        "items": items,
    }
    if include_private:
        data["customerId"] = str(order.customer_user_id) if order.customer_user_id else None
        try:
            payment = order.payment
            data["payment"] = {
                "id": str(payment.id), "method": payment.method, "status": payment.status,
                "amountRwf": payment.amount_rwf, "provider": payment.provider,
            }
        except Payment.DoesNotExist:
            data["payment"] = None
    return data


def image_upload(request):
    uploaded = request.FILES.get("file") or request.FILES.get("image")
    if not uploaded:
        raise ApiError("Choose an image file to upload")
    if uploaded.size > 8 * 1024 * 1024:
        raise ApiError("Image must be 8 MB or smaller", 413)
    if not uploaded.content_type or not uploaded.content_type.startswith("image/"):
        raise ApiError("Only image files are accepted", 415)
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ApiError("Supabase Storage is not configured on the Django service", 503)
    bucket = settings.SUPABASE_STORAGE_BUCKET
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "-", uploaded.name.rsplit("/", 1)[-1])[:120]
    object_path = f"marketplace/{uuid.uuid4().hex}-{safe_name}"
    endpoint = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{quote(bucket)}/{quote(object_path)}"
    try:
        response = requests.post(
            endpoint,
            data=uploaded.read(),
            headers={
                "Authorization": "Bearer " + settings.SUPABASE_SERVICE_ROLE_KEY,
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Content-Type": uploaded.content_type,
                "x-upsert": "false",
            },
            timeout=20,
        )
    except requests.RequestException:
        raise ApiError("Supabase Storage could not be reached", 502)
    if response.status_code not in (200, 201):
        raise ApiError("Supabase Storage rejected the image upload", 502)
    public_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{quote(bucket)}/{quote(object_path)}"
    return {"url": public_url, "imageUrl": public_url, "path": object_path}


def handle_products(request, product_key=None):
    admin = bool(_admin_claims(request))
    if product_key:
        product = product_queryset(include_inactive=admin).filter(Q(id=as_uuid(product_key)) | Q(slug=product_key)).first() if as_uuid(product_key) else product_queryset(include_inactive=admin).filter(slug=product_key).first()
        if request.method == "GET":
            if not product:
                raise ApiError("Product not found", 404)
            return result({"product": product_json(product, include_private=admin)})
        require_admin(request)
        if not product:
            raise ApiError("Product not found", 404)
        if request.method == "DELETE":
            product.is_active = False
            product.save(update_fields=["is_active", "updated_at"])
            return result({"ok": True})
        if request.method != "PATCH":
            return fail("Method not allowed", 405)
        data = body_json(request)
        fields = {
            "sku": "sku", "name": "name", "slug": "slug", "description": "description",
            "priceRwf": "price_rwf", "compareAtPriceRwf": "compare_at_price_rwf",
            "stock": "stock", "imageUrl": "image_url", "isActive": "is_active",
            "isFeatured": "is_featured", "displaySection": "display_section",
            "displayPriority": "display_priority",
        }
        for api_name, model_name in fields.items():
            if api_name in data:
                value = data[api_name]
                if api_name in {"priceRwf", "stock", "displayPriority"} and value is not None:
                    value = int(value)
                    if api_name in {"priceRwf", "stock"} and value < 0:
                        raise ApiError(f"{api_name} cannot be negative")
                setattr(product, model_name, value)
        if "categoryId" in data:
            product.category = Category.objects.filter(id=as_uuid(data["categoryId"])).first() if data["categoryId"] else None
        if "sellerId" in data:
            seller = Seller.objects.filter(id=as_uuid(data["sellerId"]), status=Seller.Status.APPROVED).first() if data["sellerId"] else None
            if data["sellerId"] and not seller:
                raise ApiError("Choose an approved seller", 409)
            product.seller = seller
        product.save()
        product.refresh_from_db()
        return result({"product": product_json(product, include_private=True)})

    if request.method == "GET":
        include_inactive = request.GET.get("admin") == "true" and admin
        qs = product_queryset(include_inactive=include_inactive)
        q = clean(request.GET.get("q"), 100)
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q) | Q(sku__icontains=q))
        category = clean(request.GET.get("category"), 140)
        if category:
            qs = qs.filter(Q(category__slug=category) | Q(category__name__iexact=category))
        seller = clean(request.GET.get("seller"), 100)
        if seller:
            seller_uuid = as_uuid(seller)
            qs = qs.filter(Q(seller_id=seller_uuid) if seller_uuid else Q(seller__business_name__iexact=seller))
        ids = [as_uuid(value) for value in clean(request.GET.get("ids"), 4000).split(",") if value]
        if request.GET.get("ids") is not None:
            qs = qs.filter(id__in=[value for value in ids if value])
        exclude = as_uuid(request.GET.get("exclude"))
        if exclude:
            qs = qs.exclude(id=exclude)
        low = request.GET.get("minPrice")
        high = request.GET.get("maxPrice")
        if low and low.isdigit():
            qs = qs.filter(price_rwf__gte=int(low))
        if high and high.isdigit():
            qs = qs.filter(price_rwf__lte=int(high))
        if request.GET.get("inStock") == "1":
            qs = qs.filter(stock__gt=0)
        if request.GET.get("featured") == "1":
            qs = qs.filter(is_featured=True)
        sort = request.GET.get("sort", "newest")
        if sort == "price-asc":
            qs = qs.order_by("price_rwf")
        elif sort == "price-desc":
            qs = qs.order_by("-price_rwf")
        elif sort == "name":
            qs = qs.order_by("name")
        elif sort == "featured":
            qs = qs.order_by("-display_priority", "-is_featured", "-created_at")
        elif sort == "best-selling":
            qs = qs.annotate(sold=Sum("order_items__quantity")).order_by("-sold", "-created_at")
        else:
            qs = qs.order_by("-created_at")

        total = qs.count()
        page_size_raw = request.GET.get("pageSize")
        page_raw = request.GET.get("page")
        page_size = max(1, min(int(page_size_raw) if page_size_raw and page_size_raw.isdigit() else 12, 60))
        page = max(1, int(page_raw) if page_raw and page_raw.isdigit() else 1)
        if page_raw is not None or page_size_raw is not None:
            qs = qs[(page - 1) * page_size:page * page_size]
        products = [product_json(item, include_private=include_inactive) for item in qs]
        return result({"products": products, "total": total, "page": page, "pageSize": page_size})

    require_admin(request)
    data = body_json(request)
    sku = clean(data.get("sku"), 80)
    name = clean(data.get("name"), 220)
    price = data.get("priceRwf")
    stock = data.get("stock", 0)
    product_slug = slugify(clean(data.get("slug") or name, 240))
    if not sku or not name or not product_slug:
        raise ApiError("SKU, product name and slug are required")
    try:
        price = int(price)
        stock = int(stock)
    except (ValueError, TypeError):
        raise ApiError("Enter a valid price and stock quantity")
    if price < 0 or stock < 0:
        raise ApiError("Price and stock cannot be negative")
    category = Category.objects.filter(id=as_uuid(data.get("categoryId"))).first() if data.get("categoryId") else None
    seller = Seller.objects.filter(id=as_uuid(data.get("sellerId")), status=Seller.Status.APPROVED).first() if data.get("sellerId") else None
    if data.get("sellerId") and not seller:
        raise ApiError("Choose an approved seller", 409)
    try:
        product = Product.objects.create(
            sku=sku, name=name, slug=product_slug, description=clean(data.get("description"), 4000) or None,
            price_rwf=price, compare_at_price_rwf=data.get("compareAtPriceRwf"),
            stock=stock, image_url=clean(data.get("imageUrl"), 700) or None,
            category=category, seller=seller, is_active=True,
            is_featured=bool(data.get("isFeatured", False)),
            display_section=clean(data.get("displaySection"), 40) or None,
            display_priority=int(data.get("displayPriority", 0) or 0),
        )
    except IntegrityError:
        raise ApiError("A product with this SKU or slug already exists", 409)
    return result({"product": product_json(product, include_private=True)}, 201)


def handle_categories(request):
    if request.method == "GET":
        return result({"categories": [{
            "id": str(item.id), "name": item.name, "slug": item.slug,
            "_count": {"products": item.products.filter(is_active=True).count()},
        } for item in Category.objects.order_by("name")]})
    require_admin(request)
    data = body_json(request)
    if request.method == "POST":
        name = clean(data.get("name"), 120)
        category_slug = slugify(clean(data.get("slug") or name, 140))
        if len(name) < 2:
            raise ApiError("Category name is required")
        try:
            item = Category.objects.create(name=name, slug=category_slug)
        except IntegrityError:
            raise ApiError("Category name or slug already exists", 409)
        return result({"category": category_json(item)}, 201)
    if request.method == "PATCH":
        item = Category.objects.filter(id=as_uuid(data.get("id"))).first()
        if not item:
            raise ApiError("Category not found", 404)
        if clean(data.get("name"), 120):
            item.name = clean(data["name"], 120)
        if clean(data.get("slug"), 140):
            item.slug = slugify(data["slug"])
        try:
            item.save()
        except IntegrityError:
            raise ApiError("Category name or slug already exists", 409)
        return result({"category": category_json(item)})
    return fail("Method not allowed", 405)


def handle_sellers(request):
    admin = bool(_admin_claims(request))
    if request.method == "GET":
        qs = Seller.objects.all() if admin else Seller.objects.filter(status=Seller.Status.APPROVED)
        sellers = []
        for seller in qs.order_by("business_name"):
            item = seller_json(seller, include_admin=admin)
            if request.GET.get("includeProducts") == "1":
                products = product_queryset().filter(seller=seller)[:12]
                item["products"] = [product_json(product) for product in products]
                item["since"] = iso(seller.created_at)
            sellers.append(item)
        return result({"sellers": sellers})
    require_admin(request)
    data = body_json(request)
    if request.method == "POST":
        business = clean(data.get("businessName"), 180)
        owner = clean(data.get("ownerName"), 160)
        phone = clean(data.get("phone"), 32)
        username = clean(data.get("loginUsername"), 80)
        password = data.get("password") if isinstance(data.get("password"), str) else ""
        email = clean(data.get("email"), 254) or None
        address = clean(data.get("address"), 300) or None
        if not business or not owner or not phone or len(username) < 3 or len(password) < 8:
            raise ApiError("Business, owner, phone, username (3+ chars), and password (8+ chars) are required")
        try:
            seller = Seller.objects.create(
                business_name=business, owner_name=owner, phone=phone, email=email,
                address=address, login_username=username, password_hash=make_password(password),
                status=Seller.Status.APPROVED,
            )
        except IntegrityError:
            raise ApiError("Seller username is already in use", 409)
        return result({"seller": seller_json(seller, include_admin=True)}, 201)
    if request.method in ("PATCH", "DELETE"):
        seller = Seller.objects.filter(id=as_uuid(data.get("id"))).first()
        if not seller:
            raise ApiError("Seller not found", 404)
        if request.method == "DELETE":
            seller.status = Seller.Status.SUSPENDED
        else:
            if "status" in data:
                status = clean(data.get("status"), 16).upper()
                if status not in {choice[0] for choice in Seller.Status.choices}:
                    raise ApiError("Invalid seller status")
                seller.status = status
            for api_name, field, limit in [
                ("businessName", "business_name", 180), ("ownerName", "owner_name", 160),
                ("phone", "phone", 32), ("email", "email", 254), ("address", "address", 300),
            ]:
                if api_name in data:
                    setattr(seller, field, clean(data[api_name], limit) or None)
            if "newPassword" in data:
                new_password = data.get("newPassword") if isinstance(data.get("newPassword"), str) else ""
                if len(new_password) < 8:
                    raise ApiError("Seller password must be at least 8 characters")
                seller.password_hash = make_password(new_password)
        seller.save()
        return result({"seller": seller_json(seller, include_admin=True)})

    return fail("Method not allowed", 405)


def handle_cart(request):
    data = body_json(request)
    cart_id = as_uuid(request.GET.get("cartId") or data.get("cartId"))
    if not cart_id:
        raise ApiError("cartId is required")
    cart, _ = Cart.objects.get_or_create(id=cart_id)
    if request.method == "GET":
        items = list(cart.items.select_related("product", "product__seller", "product__category").prefetch_related("product__images").all())
        lines = [{
            "id": str(item.id), "cartId": str(cart.id), "productId": str(item.product_id),
            "quantity": item.quantity,
            "product": {
                "id": str(item.product.id), "name": item.product.name, "slug": item.product.slug,
                "priceRwf": item.product.price_rwf, "compareAtPriceRwf": item.product.compare_at_price_rwf,
                "stock": item.product.stock, "imageUrl": item.product.image_url,
                "seller": {"businessName": item.product.seller.business_name} if item.product.seller else None,
                "category": {"name": item.product.category.name} if item.product.category else None,
            },
        } for item in items]
        subtotal = sum(line["quantity"] * line["product"]["priceRwf"] for line in lines)
        return result({"cart": {"id": str(cart.id), "items": lines, "subtotalRwf": subtotal}})
    if request.method == "POST":
        product_id = as_uuid(data.get("productId"))
        try:
            quantity = int(data.get("quantity", 0))
        except (ValueError, TypeError):
            quantity = 0
        product = product_queryset().filter(id=product_id).first() if product_id else None
        if not product:
            raise ApiError("Product not found", 404)
        if quantity < 1:
            raise ApiError("Quantity must be a positive integer")
        if quantity > product.stock:
            raise ApiError("Not enough stock", 409)
        item, _ = CartItem.objects.update_or_create(cart=cart, product=product, defaults={"quantity": quantity})
        return result({"item": {"id": str(item.id), "cartId": str(cart.id), "productId": str(product.id), "quantity": item.quantity, "product": product_json(product)}}, 201)
    if request.method == "DELETE":
        product_id = as_uuid(data.get("productId"))
        if not product_id:
            raise ApiError("productId is required")
        CartItem.objects.filter(cart=cart, product_id=product_id).delete()
        return result({"ok": True})
    if request.method == "PATCH":
        product_id = as_uuid(data.get("productId"))
        try:
            quantity = int(data.get("quantity", 0))
        except (TypeError, ValueError):
            quantity = 0
        item = CartItem.objects.filter(cart=cart, product_id=product_id).select_related("product").first()
        if not item:
            raise ApiError("Cart item not found", 404)
        if quantity <= 0:
            item.delete()
            return result({"ok": True})
        if quantity > item.product.stock:
            raise ApiError("Not enough stock", 409)
        item.quantity = quantity
        item.save(update_fields=["quantity"])
        return result({"ok": True, "quantity": quantity})
    return fail("Method not allowed", 405)


def handle_checkout(request):
    data = body_json(request)
    cart_id = as_uuid(data.get("cartId"))
    name = clean(data.get("customerName"), 160)
    phone = clean(data.get("phone"), 32)
    address = clean(data.get("deliveryAddress"), 500)
    email = clean(data.get("customerEmail"), 254) or None
    if not cart_id or len(name) < 2 or not phone or not address:
        raise ApiError("cartId, customerName, phone and deliveryAddress are required")
    digits = re.sub(r"[\s().-]", "", phone)
    if not re.fullmatch(r"(?:\+?250|0)?7\d{8}", digits):
        raise ApiError("Enter a valid Rwandan phone number, e.g. 078 123 4567")
    if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ApiError("Enter a valid email address or leave it empty")
    current_user = supabase_user(request)
    customer_id = as_uuid(current_user.get("id")) if current_user else None
    method = clean(data.get("paymentMethod"), 12).upper()
    if method not in {choice[0] for choice in Payment.Method.choices}:
        method = Payment.Method.COD
    zone = None
    if data.get("deliveryZoneId"):
        zone = DeliveryZone.objects.filter(id=as_uuid(data.get("deliveryZoneId")), active=True).first()
        if not zone:
            raise ApiError("Choose a valid delivery area", 409)
    with transaction.atomic():
        cart = Cart.objects.filter(id=cart_id).first()
        if not cart:
            raise ApiError("Your cart is empty", 409)
        items = list(cart.items.select_related("product", "product__seller").select_for_update())
        if not items:
            raise ApiError("Your cart is empty", 409)
        subtotal = 0
        checked = []
        for item in items:
            product = Product.objects.select_for_update().filter(id=item.product_id, is_active=True).first()
            if not product:
                raise ApiError("A product in the cart is no longer available", 409)
            if item.quantity > product.stock:
                raise ApiError(f"Not enough stock for {product.name}", 409)
            subtotal += product.price_rwf * item.quantity
            checked.append((item, product))
        delivery = zone.fee_rwf if zone else 0
        order_number = "GW-" + timezone.now().strftime("%Y%m%d") + "-" + uuid.uuid4().hex[:16].upper()
        order = Order.objects.create(
            order_number=order_number, customer_name=name, phone=digits,
            customer_email=email, customer_user_id=customer_id, delivery_address=address,
            subtotal_rwf=subtotal, delivery_rwf=delivery, total_rwf=subtotal + delivery,
        )
        for item, product in checked:
            product.stock -= item.quantity
            product.save(update_fields=["stock", "updated_at"])
            OrderItem.objects.create(
                order=order, product=product, seller=product.seller, product_name=product.name,
                unit_price_rwf=product.price_rwf, quantity=item.quantity,
                line_total_rwf=product.price_rwf * item.quantity,
            )
        Payment.objects.create(order=order, method=method, status=Payment.Status.PENDING, amount_rwf=order.total_rwf)
        cart.items.all().delete()
    return result({"order": order_json(order, include_private=True), "paymentIntegration": "not_configured"}, 201)


def handle_customer(request, part):
    if part == ["auth", "logout"]:
        return result({"ok": True, "message": "Sign out through Supabase Auth on the client."})
    if part and part[0] == "auth":
        return fail("Password and Google sign-in were removed. Use email OTP or phone OTP on /auth.", 410)
    profile = require_customer(request)
    if part == ["me"] or part == ["account"]:
        if request.method == "GET":
            return result({"customer": {
                "id": str(profile.id), "name": profile.name, "email": profile.email,
                "phone": profile.phone, "avatarUrl": profile.avatar_url,
                "hasPassword": False, "createdAt": iso(profile.created_at),
            }})
        if request.method == "PATCH" and part == ["account"]:
            data = body_json(request)
            if "name" in data:
                name = clean(data.get("name"), 160)
                if len(name) < 2:
                    raise ApiError("Name must be at least 2 characters")
                profile.name = name
            if "phone" in data:
                phone = clean(data.get("phone"), 32)
                if phone and not re.fullmatch(r"\+?[0-9\s().-]{9,18}", phone):
                    raise ApiError("Enter a valid phone number")
                profile.phone = phone or None
            profile.save()
            return result({"customer": {
                "id": str(profile.id), "name": profile.name, "email": profile.email,
                "phone": profile.phone, "avatarUrl": profile.avatar_url, "hasPassword": False,
            }})
    if part == ["orders"] and request.method == "GET":
        orders = Order.objects.filter(customer_user_id=profile.id).order_by("-created_at")
        return result({"orders": [order_json(order, include_private=True) for order in orders]})
    return fail("Method not allowed", 405)


def handle_wishlist(request):
    profile = require_customer(request)
    data = body_json(request)
    if request.method == "GET":
        items = WishlistItem.objects.filter(customer_id=profile.id).select_related("product", "product__category", "product__seller").prefetch_related("product__images").order_by("-created_at")
        return result({"items": [{"id": str(item.id), "productId": str(item.product_id), "createdAt": iso(item.created_at), "product": product_json(item.product)} for item in items]})
    product_id = as_uuid(data.get("productId"))
    if not product_id:
        raise ApiError("productId is required")
    if request.method == "POST":
        product = product_queryset().filter(id=product_id).first()
        if not product:
            raise ApiError("Product not found", 404)
        item, _ = WishlistItem.objects.get_or_create(customer_id=profile.id, product=product)
        return result({"ok": True, "item": {"id": str(item.id), "productId": str(product.id)}}, 201)
    if request.method == "DELETE":
        WishlistItem.objects.filter(customer_id=profile.id, product_id=product_id).delete()
        return result({"ok": True})
    return fail("Method not allowed", 405)


def handle_reviews(request, admin=False):
    if admin:
        require_admin(request)
        if request.method == "GET":
            qs = ProductReview.objects.select_related("product").order_by("-created_at")
            return result({"reviews": [{
                "id": str(row.id), "productId": str(row.product_id), "productName": row.product.name,
                "rating": row.rating, "title": row.title, "body": row.body, "status": row.status,
                "verified": row.verified, "createdAt": iso(row.created_at),
            } for row in qs]})
        data = body_json(request)
        review = ProductReview.objects.filter(id=as_uuid(data.get("id"))).first()
        if not review:
            raise ApiError("Review not found", 404)
        status = clean(data.get("status"), 12).upper()
        if status not in {choice[0] for choice in ProductReview.Status.choices}:
            raise ApiError("Invalid review status")
        review.status = status
        review.save(update_fields=["status", "updated_at"])
        return result({"ok": True, "reviewId": str(review.id), "status": review.status})

    if request.method == "GET":
        qs = ProductReview.objects.filter(status=ProductReview.Status.PUBLISHED).select_related("product").order_by("-created_at")
        product_id = as_uuid(request.GET.get("productId"))
        if product_id:
            qs = qs.filter(product_id=product_id)
        rows = list(qs[:100])
        average = round(sum(item.rating for item in rows) / len(rows), 1) if rows else 0
        return result({"reviews": [{
            "id": str(row.id), "productId": str(row.product_id), "productName": row.product.name,
            "rating": row.rating, "title": row.title, "body": row.body, "verified": row.verified,
            "createdAt": iso(row.created_at),
        } for row in rows], "averageRating": average, "totalReviews": qs.count()})
    if request.method == "POST":
        profile = require_customer(request)
        data = body_json(request)
        product = Product.objects.filter(id=as_uuid(data.get("productId")), is_active=True).first()
        try:
            rating = int(data.get("rating", 0))
        except (ValueError, TypeError):
            rating = 0
        if not product or rating not in range(1, 6):
            raise ApiError("Choose a product and a rating from 1 to 5")
        order = None
        order_key = clean(data.get("orderNumber") or data.get("orderId"), 80)
        if order_key:
            order = Order.objects.filter(Q(order_number=order_key) | Q(id=as_uuid(order_key)), customer_user_id=profile.id, status=Order.Status.DELIVERED).first()
        verified = bool(order and order.items.filter(product=product).exists())
        review = ProductReview.objects.create(
            product=product, customer_id=profile.id, order=order if verified else None,
            rating=rating, title=clean(data.get("title"), 180) or None,
            body=clean(data.get("body") or data.get("comment"), 4000) or None,
            verified=verified, status=ProductReview.Status.PENDING,
        )
        return result({"ok": True, "reviewId": str(review.id), "status": review.status}, 201)
    return fail("Method not allowed", 405)


def handle_support(request, admin=False):
    if admin:
        require_admin(request)
        if request.method == "GET":
            qs = SupportTicket.objects.select_related("seller").order_by("-created_at")
            return result({"tickets": [{
                "id": str(t.id), "subject": t.subject, "message": t.message, "status": t.status,
                "priority": t.priority, "email": t.email, "phone": t.phone, "sellerId": str(t.seller_id) if t.seller_id else None,
                "createdAt": iso(t.created_at), "updatedAt": iso(t.updated_at),
            } for t in qs]})
        data = body_json(request)
        ticket = SupportTicket.objects.filter(id=as_uuid(data.get("id"))).first()
        if not ticket:
            raise ApiError("Support ticket not found", 404)
        if "status" in data:
            status = clean(data["status"], 16).upper()
            if status not in {choice[0] for choice in SupportTicket.Status.choices}:
                raise ApiError("Invalid ticket status")
            ticket.status = status
        if "priority" in data:
            priority = clean(data["priority"], 12).upper()
            if priority not in {choice[0] for choice in SupportTicket.Priority.choices}:
                raise ApiError("Invalid ticket priority")
            ticket.priority = priority
        ticket.save()
        return result({"ok": True, "ticketId": str(ticket.id), "status": ticket.status, "priority": ticket.priority})

    if request.method == "GET":
        profile = require_customer(request)
        qs = SupportTicket.objects.filter(customer_id=profile.id).order_by("-created_at")
        return result({"tickets": [{
            "id": str(t.id), "subject": t.subject, "message": t.message, "status": t.status,
            "priority": t.priority, "createdAt": iso(t.created_at),
        } for t in qs]})
    if request.method == "POST":
        data = body_json(request)
        user = supabase_user(request)
        profile = require_customer(request)
        subject = clean(data.get("subject"), 180)
        message = clean(data.get("message"), 8000)
        if len(subject) < 3 or len(message) < 5:
            raise ApiError("Enter a subject and a message")
        ticket = SupportTicket.objects.create(
            customer_id=profile.id, subject=subject, message=message,
            email=clean(data.get("email") or user.get("email"), 254) or None,
            phone=clean(data.get("phone") or user.get("phone"), 32) or None,
        )
        return result({"ticket": {"id": str(ticket.id), "subject": ticket.subject, "status": ticket.status}}, 201)
    return fail("Method not allowed", 405)


def handle_content(request):
    admin = bool(_admin_claims(request))
    if request.method == "GET":
        qs = ContentPost.objects.all() if admin else ContentPost.objects.filter(status=ContentPost.Status.PUBLISHED)
        slug = clean(request.GET.get("slug"), 220)
        if slug:
            qs = qs.filter(slug=slug)
        posts = [{
            "id": str(p.id), "slug": p.slug, "title": p.title, "excerpt": p.excerpt,
            "body": p.body, "coverImage": p.cover_image, "status": p.status,
            "publishedAt": iso(p.published_at), "createdAt": iso(p.created_at),
        } for p in qs.order_by("-published_at", "-created_at")]
        return result({"posts": posts})
    require_admin(request)
    data = body_json(request)
    if request.method == "POST":
        title = clean(data.get("title"), 220)
        body = clean(data.get("body"), 20000)
        slug = slugify(clean(data.get("slug") or title, 220))
        if len(title) < 2 or not body:
            raise ApiError("Title and content are required")
        try:
            post = ContentPost.objects.create(
                title=title, body=body, slug=slug, excerpt=clean(data.get("excerpt"), 1000) or None,
                cover_image=clean(data.get("coverImage"), 700) or None,
                status=ContentPost.Status.PUBLISHED if data.get("status") == "PUBLISHED" else ContentPost.Status.DRAFT,
                published_at=timezone.now() if data.get("status") == "PUBLISHED" else None,
            )
        except IntegrityError:
            raise ApiError("A post with this slug already exists", 409)
        return result({"post": {"id": str(post.id), "slug": post.slug, "title": post.title, "status": post.status}}, 201)
    if request.method == "PATCH":
        post = ContentPost.objects.filter(id=as_uuid(data.get("id"))).first()
        if not post:
            raise ApiError("Post not found", 404)
        for key, field, limit in [("title", "title", 220), ("body", "body", 20000), ("excerpt", "excerpt", 1000), ("coverImage", "cover_image", 700), ("slug", "slug", 220)]:
            if key in data:
                value = clean(data[key], limit)
                setattr(post, field, slugify(value) if key == "slug" else value)
        if data.get("status") in {"DRAFT", "PUBLISHED"}:
            post.status = data["status"]
            post.published_at = timezone.now() if post.status == "PUBLISHED" and not post.published_at else post.published_at
        post.save()
        return result({"ok": True, "post": {"id": str(post.id), "slug": post.slug, "title": post.title, "status": post.status}})
    return fail("Method not allowed", 405)


def handle_delivery_zones(request):
    if request.method == "GET":
        return result({"zones": [{
            "id": str(z.id), "name": z.name, "feeRwf": z.fee_rwf,
            "etaMinDays": z.eta_min_days, "etaMaxDays": z.eta_max_days, "active": z.active,
        } for z in DeliveryZone.objects.filter(active=True).order_by("name")]})
    require_admin(request)
    data = body_json(request)
    if request.method == "POST":
        name = clean(data.get("name"), 160)
        if not name:
            raise ApiError("Delivery zone name is required")
        try:
            zone = DeliveryZone.objects.create(
                name=name, fee_rwf=max(0, int(data.get("feeRwf", 0))),
                eta_min_days=max(0, int(data.get("etaMinDays", 1))),
                eta_max_days=max(0, int(data.get("etaMaxDays", 3))),
                active=bool(data.get("active", True)),
            )
        except (IntegrityError, ValueError, TypeError):
            raise ApiError("Delivery zone name or values are invalid", 409)
        return result({"zone": {"id": str(zone.id), "name": zone.name, "feeRwf": zone.fee_rwf, "active": zone.active}}, 201)
    if request.method == "PATCH":
        zone = DeliveryZone.objects.filter(id=as_uuid(data.get("id"))).first()
        if not zone:
            raise ApiError("Delivery zone not found", 404)
        try:
            if "name" in data:
                zone.name = clean(data["name"], 160)
            if "feeRwf" in data:
                zone.fee_rwf = max(0, int(data["feeRwf"]))
            if "etaMinDays" in data:
                zone.eta_min_days = max(0, int(data["etaMinDays"]))
            if "etaMaxDays" in data:
                zone.eta_max_days = max(0, int(data["etaMaxDays"]))
        except (ValueError, TypeError):
            raise ApiError("Delivery zone values are invalid")
        if "active" in data:
            zone.active = bool(data["active"])
        zone.save()
        return result({"ok": True, "zoneId": str(zone.id)})
    return fail("Method not allowed", 405)


def handle_payments(request):
    admin = bool(_admin_claims(request))
    profile = None if admin else (require_customer(request) if request.method in {"GET", "POST"} else None)
    if request.method == "GET":
        qs = Payment.objects.select_related("order").order_by("-created_at")
        if not admin:
            qs = qs.filter(order__customer_user_id=profile.id)
        return result({"payments": [{
            "id": str(p.id), "orderId": str(p.order_id), "orderNumber": p.order.order_number,
            "method": p.method, "status": p.status, "amountRwf": p.amount_rwf,
            "currency": p.currency, "provider": p.provider, "createdAt": iso(p.created_at),
        } for p in qs]})
    if request.method == "POST":
        data = body_json(request)
        order = Order.objects.filter(order_number=clean(data.get("orderNumber"), 48)).first()
        if not order:
            raise ApiError("Order not found", 404)
        if order.customer_user_id and order.customer_user_id != profile.id:
            raise ApiError("You cannot create a payment for this order", 403)
        method = clean(data.get("method") or data.get("paymentMethod"), 12).upper()
        if method not in {choice[0] for choice in Payment.Method.choices}:
            raise ApiError("Invalid payment method")
        payment, _ = Payment.objects.get_or_create(order=order, defaults={"method": method, "amount_rwf": order.total_rwf})
        return result({"payment": {"id": str(payment.id), "status": payment.status, "method": payment.method, "amountRwf": payment.amount_rwf}, "providerIntegration": "not_configured"}, 201)
    require_admin(request)
    data = body_json(request)
    payment = Payment.objects.filter(id=as_uuid(data.get("id"))).first()
    if not payment:
        raise ApiError("Payment not found", 404)
    status = clean(data.get("status"), 12).upper()
    if status not in {choice[0] for choice in Payment.Status.choices}:
        raise ApiError("Invalid payment status")
    payment.status = status
    payment.save(update_fields=["status", "updated_at"])
    return result({"ok": True, "paymentId": str(payment.id), "status": payment.status})


def handle_admin_orders(request):
    require_admin(request)
    if request.method == "GET":
        qs = Order.objects.all().order_by("-created_at")
        search = clean(request.GET.get("q"), 120)
        if search:
            qs = qs.filter(Q(order_number__icontains=search) | Q(customer_name__icontains=search) | Q(phone__icontains=search))
        status = clean(request.GET.get("status"), 20).upper()
        if status:
            qs = qs.filter(status=status)
        return result({"orders": [order_json(order, include_private=True) for order in qs[:300]], "total": qs.count()})
    data = body_json(request)
    order = Order.objects.filter(Q(id=as_uuid(data.get("id"))) | Q(order_number=clean(data.get("orderNumber"), 48))).first()
    if not order:
        raise ApiError("Order not found", 404)
    if not order:
        raise ApiError("Order not found", 404)
    status = clean(data.get("status"), 20).upper()
    if status not in {choice[0] for choice in Order.Status.choices}:
        raise ApiError("Invalid order status")
    order.status = status
    order.save(update_fields=["status", "updated_at"])
    return result({"order": order_json(order, include_private=True)})


def handle_seller(request, part):
    if part == ["auth", "login"] and request.method == "POST":
        data = body_json(request)
        username = clean(data.get("loginUsername") or data.get("username"), 80)
        password = data.get("password") if isinstance(data.get("password"), str) else ""
        seller = Seller.objects.filter(login_username__iexact=username).first()
        if not seller or not check_password(password, seller.password_hash):
            raise ApiError("Incorrect seller username or password", 401)
        if seller.status != Seller.Status.APPROVED:
            raise ApiError("This seller account is not active", 403)
        token = signing.dumps({"seller_id": str(seller.id)}, salt="gwizineza-seller")
        response = result({"ok": True, "seller": {
            "id": str(seller.id), "businessName": seller.business_name, "ownerName": seller.owner_name,
            "phone": seller.phone, "email": seller.email, "address": seller.address,
        }})
        response.set_cookie("gwizineza_seller_session", token, max_age=24 * 60 * 60, httponly=True, secure=not settings.DEBUG, samesite="Lax", path="/")
        return response
    if part == ["auth", "logout"]:
        response = result({"ok": True})
        response.delete_cookie("gwizineza_seller_session", path="/")
        return response
    seller = require_seller(request)
    if part == ["me"]:
        if request.method == "GET":
            return result({"seller": seller_json(seller, include_admin=True)})
        if request.method == "PATCH":
            data = body_json(request)
            for key, field, limit in [("businessName", "business_name", 180), ("ownerName", "owner_name", 160), ("phone", "phone", 32), ("email", "email", 254), ("address", "address", 300)]:
                if key in data:
                    setattr(seller, field, clean(data[key], limit) or None)
            seller.save()
            return result({"seller": seller_json(seller, include_admin=True)})
    if part == ["products"]:
        if request.method == "GET":
            qs = product_queryset(include_inactive=True).filter(seller=seller).order_by("-created_at")
            return result({"products": [product_json(p, include_private=True) for p in qs], "total": qs.count(), "page": 1, "pageSize": qs.count()})
        data = body_json(request)
        if request.method == "POST":
            name = clean(data.get("name"), 220)
            sku = clean(data.get("sku"), 80) or "SELL-" + uuid.uuid4().hex[:10].upper()
            slug = slugify(clean(data.get("slug") or name, 240) + "-" + uuid.uuid4().hex[:5])
            try:
                price = int(data.get("priceRwf", 0))
                stock = int(data.get("stock", 0))
            except (TypeError, ValueError):
                raise ApiError("Enter a valid price and stock")
            if len(name) < 2 or price < 0 or stock < 0:
                raise ApiError("Product name, non-negative price and stock are required")
            product = Product.objects.create(
                sku=sku, name=name, slug=slug, description=clean(data.get("description"), 4000) or None,
                price_rwf=price, stock=stock, image_url=clean(data.get("imageUrl"), 700) or None,
                category=Category.objects.filter(id=as_uuid(data.get("categoryId"))).first() if data.get("categoryId") else None,
                seller=seller, is_active=True,
            )
            return result({"product": product_json(product, include_private=True)}, 201)
        if request.method in {"PATCH", "DELETE"}:
            product = Product.objects.filter(id=as_uuid(data.get("id") or data.get("productId")), seller=seller).first()
            if not product:
                raise ApiError("Seller product not found", 404)
            if request.method == "DELETE":
                product.is_active = False
                product.save(update_fields=["is_active", "updated_at"])
                return result({"ok": True})
            for key, field in [("name", "name"), ("description", "description"), ("imageUrl", "image_url"), ("isActive", "is_active"), ("stock", "stock"), ("priceRwf", "price_rwf")]:
                if key in data:
                    setattr(product, field, data[key])
            product.save()
            return result({"product": product_json(product, include_private=True)})
    if part == ["orders"] and request.method == "GET":
        qs = Order.objects.filter(items__seller=seller).distinct().order_by("-created_at")
        orders = [order_json(order, include_private=True) for order in qs[:200]]
        for order_data in orders:
            seller_items = [item for item in order_data["items"] if item["sellerId"] == str(seller.id)]
            seller_subtotal = sum(item["lineTotalRwf"] for item in seller_items)
            order_data["items"] = seller_items
            order_data["subtotalRwf"] = seller_subtotal
            order_data["deliveryRwf"] = 0
            order_data["totalRwf"] = seller_subtotal
        revenue = sum(order["totalRwf"] for order in orders if order["status"] != Order.Status.CANCELLED)
        units = sum(item["quantity"] for order in orders for item in order["items"])
        return result({"orders": orders, "summary": {"orderCount": qs.count(), "revenueRwf": revenue, "unitsSold": units}})
    if part == ["stats"] and request.method == "GET":
        products = Product.objects.filter(seller=seller)
        orders = Order.objects.filter(items__seller=seller).distinct()
        count = orders.count()
        return result({
            "products": products.count(),
            "lowStock": products.filter(is_active=True, stock__lte=5).count(),
            "orders": count,
            "revenueRwf": sum(order.total_rwf for order in orders.exclude(status=Order.Status.CANCELLED)),
        })
    if part == ["product-images"]:
        data = body_json(request)
        product_id = as_uuid(request.GET.get("productId") or data.get("productId"))
        image_id = as_uuid(request.GET.get("id") or data.get("id"))
        if request.method == "GET":
            product = Product.objects.filter(id=product_id, seller=seller).first() if product_id else None
            if not product:
                raise ApiError("Seller product not found", 404)
            return result({"images": [{
                "id": str(i.id), "productId": str(product.id), "url": i.url,
                "altText": i.alt_text, "isPrimary": i.is_primary, "sortOrder": i.sort_order,
            } for i in product.images.all()]})
        if request.method == "POST":
            product = Product.objects.filter(id=product_id, seller=seller).first() if product_id else None
            if not product:
                raise ApiError("Seller product not found", 404)
            url = clean(data.get("url"), 700)
            if not url:
                raise ApiError("Image URL is required")
            image = ProductImage.objects.create(
                product=product, url=url, alt_text=clean(data.get("altText"), 240) or None,
                sort_order=max(0, int(data.get("sortOrder", 0) or 0)),
            )
            if data.get("isPrimary") or not product.images.exclude(id=image.id).filter(is_primary=True).exists():
                ProductImage.objects.filter(product=product).exclude(id=image.id).update(is_primary=False)
                image.is_primary = True
                image.save(update_fields=["is_primary", "updated_at"])
            return result({"image": {"id": str(image.id), "url": image.url, "isPrimary": image.is_primary}}, 201)
        image = ProductImage.objects.select_related("product").filter(
            id=image_id, product__seller=seller
        ).first() if image_id else None
        if not image:
            raise ApiError("Product image not found", 404)
        product = image.product
        if request.method == "DELETE":
            was_primary = image.is_primary
            image.delete()
            if was_primary:
                replacement = product.images.first()
                if replacement:
                    replacement.is_primary = True
                    replacement.save(update_fields=["is_primary", "updated_at"])
            return result({"ok": True})
        if request.method == "PATCH":
            if "altText" in data:
                image.alt_text = clean(data["altText"], 240) or None
            if "sortOrder" in data:
                image.sort_order = max(0, int(data["sortOrder"]))
            if data.get("isPrimary"):
                ProductImage.objects.filter(product=product).exclude(id=image.id).update(is_primary=False)
                image.is_primary = True
            image.save()
            return result({"image": {"id": str(image.id), "url": image.url, "isPrimary": image.is_primary}})
        return fail("Method not allowed", 405)
    if part == ["image-upload"] and request.method == "POST":
        return result(image_upload(request), 201)
    return fail("Method not allowed or seller API route not found", 404)


def handle_admin(request, part):
    if part == ["login"] and request.method == "POST":
        data = body_json(request)
        configured = settings.ADMIN_PASSWORD
        provided = data.get("password") if isinstance(data.get("password"), str) else ""
        if not configured or provided != configured:
            raise ApiError("Incorrect admin password", 401)
        token = signing.dumps({"admin": True}, salt="gwizineza-admin")
        response = result({"ok": True})
        response.set_cookie("gwizineza_admin_session", token, max_age=12 * 60 * 60, httponly=True, secure=not settings.DEBUG, samesite="Lax", path="/")
        return response
    if part == ["logout"]:
        response = result({"ok": True})
        response.delete_cookie("gwizineza_admin_session", path="/")
        return response
    require_admin(request)
    if part == ["diagnostics", "database"]:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return result({"ok": True, "database": "connected", "provider": "Supabase PostgreSQL"})
        except Exception:
            return fail("Supabase PostgreSQL is unavailable", 503)
    if part == ["stats"]:
        today = timezone.now().date()
        start = today - timedelta(days=13)
        orders = list(Order.objects.exclude(status=Order.Status.CANCELLED).order_by("-created_at")[:500])
        sales_by_day = []
        for offset in range(14):
            day = start + timedelta(days=offset)
            day_orders = [order for order in orders if order.created_at.date() == day]
            sales_by_day.append({"date": day.isoformat(), "totalRwf": sum(order.total_rwf for order in day_orders), "orders": len(day_orders)})
        products = Product.objects.all().order_by("-created_at")
        sellers = Seller.objects.all().order_by("-updated_at")
        customers = CustomerProfile.objects.all()
        low = products.filter(is_active=True, stock__lte=5)
        return result({
            "totals": {
                "salesRwf": sum(order.total_rwf for order in orders), "orders": Order.objects.count(),
                "products": products.count(), "activeProducts": products.filter(is_active=True).count(),
                "sellers": sellers.count(), "pendingSellers": sellers.filter(status=Seller.Status.PENDING).count(),
                "customers": customers.count(),
            },
            "salesByDay": sales_by_day,
            "recentOrders": [order_json(order, include_private=True) for order in orders[:8]],
            "recentProducts": [product_json(p, include_private=True) for p in products[:8]],
            "lowStock": [product_json(p, include_private=True) for p in low[:12]],
            "sellerActivity": [{
                "id": str(s.id), "businessName": s.business_name, "status": s.status,
                "updatedAt": iso(s.updated_at), "_count": {"products": s.products.count()},
            } for s in sellers[:8]],
        })
    if part == ["customers"]:
        qs = CustomerProfile.objects.order_by("-created_at")
        q = clean(request.GET.get("q"), 100)
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q))
        return result({"customers": [{
            "id": str(c.id), "name": c.name, "email": c.email, "phone": c.phone,
            "createdAt": iso(c.created_at), "orders": Order.objects.filter(customer_user_id=c.id).count(),
        } for c in qs[:500]], "total": qs.count()})
    if part == ["orders"]:
        return handle_admin_orders(request)
    if part == ["finance"]:
        payments = Payment.objects.all()
        totals = {status.lower(): payments.filter(status=status).aggregate(total=Sum("amount_rwf"))["total"] or 0 for status, _ in Payment.Status.choices}
        paid_by_seller = {}
        for item in OrderItem.objects.filter(order__payment__status=Payment.Status.PAID).select_related("seller", "order"):
            key = str(item.seller_id) if item.seller_id else "marketplace"
            group = paid_by_seller.setdefault(key, {"sellerId": key, "sellerName": item.seller.business_name if item.seller else "Marketplace", "salesRwf": 0, "unitsSold": 0})
            group["salesRwf"] += item.line_total_rwf
            group["unitsSold"] += item.quantity
        return result({
            "summary": {
                "paidRwf": totals.get("paid", 0),
                "pendingRwf": totals.get("pending", 0),
                "refundedRwf": totals.get("refunded", 0),
                "cancelledRwf": totals.get("cancelled", 0),
                "orders": Order.objects.count(),
            },
            "totals": totals,
            "orderCount": Order.objects.count(),
            "paymentCount": payments.count(),
            "bySeller": list(paid_by_seller.values()),
            "providerIntegration": "not_configured",
        })
    if part == ["reviews"]:
        return handle_reviews(request, admin=True)
    if part == ["support"]:
        return handle_support(request, admin=True)
    if part == ["settings"]:
        settings_row, _ = SiteSettings.objects.get_or_create(key="primary")
        if request.method == "GET":
            return result({"settings": {
                "id": str(settings_row.id), "key": settings_row.key, "siteName": settings_row.site_name,
                "tagline": settings_row.tagline, "location": settings_row.location, "region": settings_row.region,
                "phone": settings_row.phone, "email": settings_row.email, "whatsapp": settings_row.whatsapp,
                "copyrightText": settings_row.copyright_text, "copyrightYear": settings_row.copyright_year,
                "footerCredit": settings_row.footer_credit, "announcementText": settings_row.announcement_text,
                "announcementEnabled": settings_row.announcement_enabled, "mapLat": settings_row.map_lat,
                "mapLng": settings_row.map_lng,
            }, "database": "connected"})
        if request.method == "PATCH":
            data = body_json(request)
            fields = {
                "siteName": ("site_name", 160), "tagline": ("tagline", 240), "location": ("location", 160),
                "region": ("region", 160), "phone": ("phone", 32), "email": ("email", 254),
                "whatsapp": ("whatsapp", 32), "copyrightText": ("copyright_text", 240),
                "footerCredit": ("footer_credit", 240), "announcementText": ("announcement_text", 300),
            }
            for key, (field, limit) in fields.items():
                if key in data:
                    setattr(settings_row, field, clean(data[key], limit) or None)
            if "announcementEnabled" in data:
                settings_row.announcement_enabled = bool(data["announcementEnabled"])
            for key, field in [("copyrightYear", "copyright_year"), ("mapLat", "map_lat"), ("mapLng", "map_lng")]:
                if key in data and data[key] is not None:
                    try:
                        setattr(settings_row, field, int(data[key]) if field == "copyright_year" else float(data[key]))
                    except (ValueError, TypeError):
                        raise ApiError(f"Invalid value for {key}")
            settings_row.save()
            return result({"ok": True})
    if part == ["image-upload"] and request.method == "POST":
        return result(image_upload(request), 201)
    return fail("Admin API route not found", 404)


def handle_product_images(request):
    data = body_json(request)
    product_id = as_uuid(request.GET.get("productId") or data.get("productId"))
    image_id = as_uuid(request.GET.get("id") or data.get("id"))
    if request.method == "GET":
        product = Product.objects.filter(id=product_id).first() if product_id else None
        if not product:
            raise ApiError("productId is required", 400)
        return result({"images": [{
            "id": str(image.id), "productId": str(image.product_id), "url": image.url,
            "altText": image.alt_text, "sortOrder": image.sort_order, "isPrimary": image.is_primary,
        } for image in product.images.all()]})
    require_admin(request)
    if request.method == "POST":
        product = Product.objects.filter(id=product_id).first() if product_id else None
        if not product:
            raise ApiError("Product not found", 404)
        url = clean(data.get("url"), 700)
        if not url:
            raise ApiError("Image URL is required")
        image = ProductImage.objects.create(
            product=product, url=url, alt_text=clean(data.get("altText"), 240) or None,
            sort_order=max(0, int(data.get("sortOrder", 0) or 0)),
        )
        if data.get("isPrimary") or not product.images.exclude(id=image.id).filter(is_primary=True).exists():
            product.images.exclude(id=image.id).update(is_primary=False)
            image.is_primary = True
            image.save(update_fields=["is_primary", "updated_at"])
        return result({"image": {"id": str(image.id), "url": image.url, "isPrimary": image.is_primary}}, 201)
    image = ProductImage.objects.select_related("product").filter(id=image_id).first() if image_id else None
    if not image:
        raise ApiError("Product image not found", 404)
    product = image.product
    if request.method == "DELETE":
        was_primary = image.is_primary
        image.delete()
        if was_primary:
            replacement = product.images.first()
            if replacement:
                replacement.is_primary = True
                replacement.save(update_fields=["is_primary", "updated_at"])
        return result({"ok": True})
    if request.method == "PATCH":
        if "altText" in data:
            image.alt_text = clean(data["altText"], 240) or None
        if "sortOrder" in data:
            image.sort_order = max(0, int(data["sortOrder"]))
        if data.get("isPrimary"):
            product.images.exclude(id=image.id).update(is_primary=False)
            image.is_primary = True
        image.save()
        return result({"image": {"id": str(image.id), "url": image.url, "isPrimary": image.is_primary}})
    return fail("Method not allowed", 405)

def handle_sms_hook(request):
    secret = getattr(settings, "SUPABASE_SEND_SMS_HOOK_SECRET", "")
    api_key = getattr(settings, "TEXTBEE_API_KEY", "")
    device_id = getattr(settings, "TEXTBEE_DEVICE_ID", "")
    if not secret or not api_key:
        raise ApiError("TextBee SMS hook is not configured", 503)

    raw_body = request.body
    hook_id = request.headers.get("webhook-id", "")
    timestamp = request.headers.get("webhook-timestamp", "")
    signatures = request.headers.get("webhook-signature", "")
    if not hook_id or not timestamp or not signatures:
        raise ApiError("Missing Supabase SMS hook signature headers", 401)
    try:
        if abs(int(time.time()) - int(timestamp)) > 300:
            raise ValueError("stale timestamp")
        signing_secret = secret.split(",", 1)[-1] if secret.startswith("v1,") else secret
        if signing_secret.startswith("whsec_"):
            key = base64.b64decode(signing_secret[6:])
        else:
            key = signing_secret.encode("utf-8")
        signed_content = hook_id.encode() + b"." + timestamp.encode() + b"." + raw_body
        expected = base64.b64encode(hmac.new(key, signed_content, hashlib.sha256).digest()).decode("ascii")
        candidates = [piece.split(",", 1)[1] for piece in signatures.split() if piece.startswith("v1,")]
        if not any(hmac.compare_digest(expected, candidate) for candidate in candidates):
            raise ValueError("signature mismatch")
    except (ValueError, TypeError, base64.binascii.Error):
        raise ApiError("Invalid Supabase Auth hook signature", 401)

    try:
        payload = json.loads(raw_body or b"{}")
    except ValueError:
        raise ApiError("Invalid JSON payload", 400)
    phone = (payload.get("user") or {}).get("phone")
    otp = (payload.get("sms") or {}).get("otp")
    if not phone or not otp:
        raise ApiError("Phone number and OTP are required", 400)

    message = "Gwizineza Market verification code: " + str(otp) + ". Do not share this code with anyone."
    body = {"recipients": [phone], "message": message}
    if device_id:
        body["deviceId"] = device_id
    try:
        response = requests.post(
            "https://api.textbee.dev/api/v1/gateway/send-sms",
            json=body,
            headers={"Content-Type": "application/json", "x-api-key": api_key},
            timeout=15,
        )
    except requests.RequestException:
        raise ApiError("SMS provider could not be reached", 502)
    if response.status_code not in (200, 201):
        print("TextBee SMS send failed with HTTP", response.status_code)
        raise ApiError("SMS provider failed to send the OTP", 502)
    return JsonResponse({}, status=200)


def handle_public_site_settings(request):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    row = SiteSettings.objects.filter(key="primary").first()
    if not row:
        values = {
            "siteName": "Gwizineza Market",
            "tagline": "Everyday goods from trusted local sellers, connected in one market.",
            "location": "Kabarondo, Rwanda",
            "region": "Kabarondo · Kayonza District · Eastern Province",
            "phone": None, "email": None, "whatsapp": None,
            "copyrightText": "Gwizineza Market", "copyrightYear": 2026,
            "footerCredit": "Created by Mucyo Pacifique",
            "announcementText": "Serving customers from Kabarondo, Rwanda",
            "announcementEnabled": True, "mapLat": -2.0127, "mapLng": 30.5585,
        }
        return result({"settings": values})
    return result({"settings": {
        "siteName": row.site_name, "tagline": row.tagline, "location": row.location,
        "region": row.region, "phone": row.phone or "", "email": row.email or "", "whatsapp": row.whatsapp or "",
        "copyrightText": row.copyright_text, "copyrightYear": row.copyright_year,
        "footerCredit": row.footer_credit, "announcementText": row.announcement_text,
        "announcementEnabled": row.announcement_enabled, "mapLat": row.map_lat, "mapLng": row.map_lng,
    }})


def dispatch_inner(request, api_path):
    parts = [clean(part, 240) for part in api_path.strip("/").split("/") if part]
    if not parts:
        return result({"service": "Gwizineza Django API"})
    if parts == ["health"]:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return result({"ok": True, "database": "connected", "provider": "Supabase PostgreSQL"})
        except Exception:
            return fail("Supabase PostgreSQL is unavailable", 503)
    if parts[0] == "products":
        return handle_products(request, parts[1] if len(parts) > 1 else None)
    if parts == ["categories"]:
        return handle_categories(request)
    if parts == ["sellers"]:
        return handle_sellers(request)
    if parts == ["cart"]:
        return handle_cart(request)
    if parts == ["checkout"] and request.method == "POST":
        return handle_checkout(request)
    if len(parts) == 2 and parts[0] == "orders":
        order = Order.objects.filter(order_number=parts[1]).first()
        if not order:
            raise ApiError("Order not found", 404)
        # The order number is a high-entropy, customer-provided tracking reference.
        return result({"order": order_json(order)})
    if parts[:1] == ["customer"]:
        return handle_customer(request, parts[1:])
    if parts == ["wishlist"]:
        return handle_wishlist(request)
    if parts == ["reviews"]:
        return handle_reviews(request)
    if parts == ["support", "tickets"]:
        return handle_support(request)
    if parts == ["content"]:
        return handle_content(request)
    if parts == ["delivery", "zones"]:
        return handle_delivery_zones(request)
    if parts == ["payments"]:
        return handle_payments(request)
    if parts == ["product-images"]:
        return handle_product_images(request)
    if parts[0] == "admin":
        return handle_admin(request, parts[1:])
    if parts[0] == "seller":
        return handle_seller(request, parts[1:])
    if parts == ["auth", "send-sms-hook"] and request.method == "POST":
        return handle_sms_hook(request)
    if parts == ["site-settings"]:
        return handle_public_site_settings(request)
    return fail("API route not found", 404)


@csrf_exempt
def dispatch(request, api_path=""):
    try:
        return dispatch_inner(request, api_path)
    except ApiError as error:
        return fail(error.message, error.status)
    except IntegrityError:
        return fail("The requested change conflicts with existing data.", 409)
    except Exception:
        # Never leak database URLs, tokens, SQL or internal stack traces to clients.
        return fail("An unexpected server error occurred. Check the Django service logs.", 500)
