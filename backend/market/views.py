import hashlib
import hmac
import json
import re
import secrets
import time
import uuid
from datetime import timedelta
from urllib.parse import quote

import requests
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.core.cache import cache
from django.db import IntegrityError, connection, transaction
from django.db.models import Avg, Count, Q, Sum
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt

from .models import (
    AuditLog, Cart, CartItem, Category, ContentPost, CustomerProfile,
    DeliveryZone, PaymentRecord, Product, ProductImage, ProductReview,
    Seller, SiteSettings, StoreOrder, StoreOrderItem, SupportTicket,
    WishlistItem,
)


def j(data, status=200):
    return JsonResponse(data, status=status, safe=not isinstance(data, (list, tuple)))


def read_body(request):
    try:
        value = json.loads(request.body.decode("utf-8") or "{}")
        return value if isinstance(value, dict) else {}
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {}


def clean(value, limit=500):
    return value.strip()[:limit] if isinstance(value, str) else ""


def iso(value):
    return value.isoformat() if value else None


def admin_id(request):
    token = request.COOKIES.get("gwizineza_admin_session")
    if not token:
        return None
    try:
        value = signing.loads(token, salt="gwizineza-admin", max_age=86400)
        return "admin" if value.get("role") == "admin" else None
    except signing.BadSignature:
        return None


def customer_for_request(request):
    token = request.COOKIES.get("gwizineza_customer_session")
    if not token:
        return None
    try:
        profile_id = signing.loads(token, salt="gwizineza-customer", max_age=60 * 60 * 24 * 30)
        return CustomerProfile.objects.filter(id=profile_id).first()
    except (signing.BadSignature, ValueError, TypeError):
        return None


def seller_for_request(request):
    token = request.COOKIES.get("gwizineza_seller_session")
    if not token:
        return None
    try:
        seller_id = signing.loads(token, salt="gwizineza-seller", max_age=86400)
        return Seller.objects.filter(id=seller_id, status=Seller.Status.APPROVED).first()
    except (signing.BadSignature, ValueError, TypeError):
        return None


def require_admin(request):
    if not admin_id(request):
        return j({"error": "Admin authentication required"}, 401)
    return None


def require_customer(request):
    profile = customer_for_request(request)
    if not profile:
        return None, j({"error": "Customer authentication required"}, 401)
    return profile, None


def require_seller(request):
    seller = seller_for_request(request)
    if not seller:
        return None, j({"error": "Seller authentication required or seller account is not active"}, 401)
    return seller, None


def same_origin_guard(request):
    # Requests are reverse-proxied by Next.js. Compare Origin with the original
    # storefront host carried in X-Forwarded-Host, not the internal API host.
    origin = request.headers.get("Origin")
    host = request.headers.get("X-Forwarded-Host") or request.headers.get("Host", "")
    if not origin:
        return True
    try:
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        return bool(parsed.netloc and parsed.netloc.lower() == host.split(",")[0].strip().lower())
    except ValueError:
        return False


def customer_dto(profile):
    return {
        "id": str(profile.id), "name": profile.name, "email": profile.email,
        "phone": profile.phone, "avatarUrl": profile.avatar_url, "hasPassword": False,
        "createdAt": iso(profile.created_at),
    }


def category_dto(category):
    return {
        "id": str(category.id), "name": category.name, "slug": category.slug,
        "productCount": category.products.count(),
        "createdAt": iso(category.created_at), "updatedAt": iso(category.updated_at),
    }


def seller_dto(seller, private=False):
    data = {
        "id": str(seller.id), "businessName": seller.business_name,
        "ownerName": seller.owner_name, "status": seller.status,
        "address": seller.address, "createdAt": iso(seller.created_at),
        "updatedAt": iso(seller.updated_at), "productCount": seller.products.count(),
    }
    if private:
        data.update({"phone": seller.phone, "email": seller.email, "loginUsername": seller.login_username})
    return data


def product_dto(product, include_private=False):
    seller = product.seller
    category = product.category
    images = [
        {"id": str(image.id), "productId": str(product.id), "url": image.url,
         "altText": image.alt_text, "sortOrder": image.sort_order,
         "isPrimary": image.is_primary, "createdAt": iso(image.created_at)}
        for image in product.images.all()
    ]
    return {
        "id": str(product.id), "sku": product.sku, "name": product.name,
        "slug": product.slug, "description": product.description,
        "priceRwf": product.price_rwf, "compareAtPriceRwf": product.compare_at_price_rwf,
        "stock": product.stock, "imageUrl": product.image_url, "isActive": product.is_active,
        "isFeatured": product.is_featured, "displaySection": product.display_section,
        "displayPriority": product.display_priority, "categoryId": str(product.category_id) if product.category_id else None,
        "sellerId": str(product.seller_id) if product.seller_id else None,
        "category": ({"id": str(category.id), "name": category.name, "slug": category.slug} if category else None),
        "seller": ({"id": str(seller.id), "businessName": seller.business_name,
                    "address": seller.address} if seller and (include_private or seller.status == Seller.Status.APPROVED) else None),
        "images": images, "createdAt": iso(product.created_at), "updatedAt": iso(product.updated_at),
    }


def payment_dto(payment):
    return {
        "id": str(payment.id), "orderId": str(payment.order_id),
        "method": payment.method, "status": payment.status,
        "amountRwf": payment.amount_rwf, "currency": payment.currency,
        "provider": payment.provider, "providerRef": payment.provider_ref,
        "metadata": payment.metadata, "createdAt": iso(payment.created_at),
        "updatedAt": iso(payment.updated_at),
    }


def order_dto(order, seller_id=None):
    items_qs = order.items.select_related("product", "seller").all()
    if seller_id:
        items_qs = items_qs.filter(seller_id=seller_id)
    items = [{
        "id": str(item.id), "orderId": str(order.id), "productId": str(item.product_id),
        "sellerId": str(item.seller_id) if item.seller_id else None,
        "productName": item.product_name, "unitPriceRwf": item.unit_price_rwf,
        "quantity": item.quantity, "lineTotalRwf": item.line_total_rwf,
        "imageUrl": item.product.image_url, "slug": item.product.slug,
    } for item in items_qs]
    payment = getattr(order, "payment", None)
    return {
        "id": str(order.id), "orderNumber": order.order_number, "status": order.status,
        "customerName": order.customer_name, "phone": order.phone,
        "customerEmail": order.customer_email, "customerId": str(order.customer_id) if order.customer_id else None,
        "deliveryAddress": order.delivery_address, "subtotalRwf": order.subtotal_rwf,
        "deliveryRwf": order.delivery_rwf, "totalRwf": order.total_rwf,
        "currency": order.currency, "items": items,
        "payment": payment_dto(payment) if payment else None,
        "createdAt": iso(order.created_at), "updatedAt": iso(order.updated_at),
    }


def settings_defaults():
    return {
        "key": "site", "siteName": "Gwizineza Market",
        "tagline": "Everyday goods from trusted local sellers, connected in one market.",
        "location": "Kabarondo, Rwanda",
        "region": "Kabarondo · Kayonza District · Eastern Province",
        "phone": "", "email": "", "whatsapp": "", "copyrightText": "Gwizineza Market",
        "copyrightYear": timezone.now().year, "footerCredit": "Created by Mucyo Pacifique",
        "announcementText": "Serving customers from Kabarondo, Rwanda",
        "announcementEnabled": True, "mapLat": -2.0127, "mapLng": 30.5585,
    }


def settings_dto(row):
    return {
        "id": row.key, "key": row.key, "siteName": row.site_name, "tagline": row.tagline,
        "location": row.location, "region": row.region, "phone": row.phone, "email": row.email,
        "whatsapp": row.whatsapp, "copyrightText": row.copyright_text,
        "copyrightYear": row.copyright_year, "footerCredit": row.footer_credit,
        "announcementText": row.announcement_text, "announcementEnabled": row.announcement_enabled,
        "mapLat": row.map_lat, "mapLng": row.map_lng,
        "createdAt": iso(row.created_at), "updatedAt": iso(row.updated_at),
    }


def public_products(query, include_inactive=False):
    qs = Product.objects.select_related("category", "seller").prefetch_related("images")
    if not include_inactive:
        qs = qs.filter(is_active=True).filter(Q(seller__isnull=True) | Q(seller__status=Seller.Status.APPROVED))
    term = clean(query.get("q"), 160)
    if term:
        qs = qs.filter(Q(name__icontains=term) | Q(description__icontains=term) | Q(sku__icontains=term))
    category = clean(query.get("category"), 120)
    if category:
        qs = qs.filter(Q(category__slug=category) | Q(category_id=category))
    seller = clean(query.get("seller"), 120)
    if seller:
        qs = qs.filter(Q(seller_id=seller) | Q(seller__business_name__iexact=seller))
    ids = [value for value in clean(query.get("ids"), 2500).split(",") if value][:60]
    if ids:
        qs = qs.filter(id__in=ids)
    try:
        minimum = int(query.get("minPrice", ""))
        if minimum >= 0:
            qs = qs.filter(price_rwf__gte=minimum)
    except (ValueError, TypeError):
        pass
    try:
        maximum = int(query.get("maxPrice", ""))
        if maximum >= 0:
            qs = qs.filter(price_rwf__lte=maximum)
    except (ValueError, TypeError):
        pass
    if query.get("inStock") == "1":
        qs = qs.filter(stock__gt=0)
    if query.get("featured") == "1":
        qs = qs.filter(is_featured=True)
    sort = query.get("sort", "newest")
    sort_map = {
        "featured": ("-display_priority", "-created_at"),
        "newest": ("-created_at",),
        "price-asc": ("price_rwf",),
        "price-desc": ("-price_rwf",),
        "name": ("name",),
    }
    qs = qs.order_by(*(sort_map.get(sort, ("-created_at",))))
    total = qs.count()
    page = query.get("page")
    page_size = query.get("pageSize")
    if page or page_size:
        try:
            page_num = max(1, int(page or 1))
            size = min(60, max(1, int(page_size or 12)))
        except (ValueError, TypeError):
            page_num, size = 1, 12
        qs = qs[(page_num - 1) * size:page_num * size]
    else:
        page_num, size = 1, total
    return {"products": [product_dto(p, include_inactive) for p in qs], "total": total, "page": page_num, "pageSize": size}


def normalize_contact(raw):
    value = clean(raw, 180).strip()
    if "@" in value:
        value = value.lower()
        if re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", value):
            return "email", value
        return None, None
    digits = re.sub(r"[\s().-]", "", value)
    if digits.startswith("+") and digits[1:].isdigit() and 9 <= len(digits[1:]) <= 15:
        return "phone", digits
    if digits.isdigit() and 9 <= len(digits) <= 13:
        # Rwanda local numbers commonly start with 07; convert to +2507...
        if digits.startswith("0"):
            digits = "250" + digits[1:]
        return "phone", "+" + digits
    return None, None


def send_customer_otp(request, body):
    kind, value = normalize_contact(body.get("contact") or body.get("email") or body.get("phone"))
    if not kind:
        return j({"error": "Enter a valid email address or phone number with country code."}, 400)
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        return j({"error": "Supabase Auth is not configured on the Django service."}, 503)
    throttle_key = "otp-send:" + hashlib.sha256(value.lower().encode()).hexdigest()
    count = cache.get(throttle_key, 0)
    if count >= 5:
        return j({"error": "Too many OTP requests. Wait an hour and try again."}, 429)
    cache.set(throttle_key, count + 1, 3600)
    payload = {"create_user": True}
    payload[kind] = value
    name = clean(body.get("name"), 160)
    if name:
        payload["data"] = {"name": name, "full_name": name}
    try:
        response = requests.post(
            settings.SUPABASE_URL + "/auth/v1/otp",
            headers={"apikey": settings.SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json=payload, timeout=12,
        )
    except requests.RequestException:
        return j({"error": "Could not contact Supabase Auth. Please try again."}, 502)
    if response.status_code >= 400:
        # Avoid returning provider internals or exposing whether an account exists.
        if response.status_code == 429:
            return j({"error": "Supabase OTP rate limit reached. Please wait and retry."}, 429)
        return j({"error": "OTP could not be sent. Check the email/SMS provider configuration and contact format."}, 502)
    return j({"ok": True, "step": "verify", "channel": kind, "destination": value,
              "message": "Verification code sent. Check your inbox or SMS messages."})


def verify_customer_otp(request, body):
    kind, value = normalize_contact(body.get("contact") or body.get("email") or body.get("phone"))
    code = re.sub(r"\s+", "", clean(body.get("code") or body.get("token") or body.get("otp"), 12))
    if not kind or not re.fullmatch(r"\d{6,8}", code):
        return j({"error": "Enter the contact method and the complete verification code."}, 400)
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        return j({"error": "Supabase Auth is not configured on the Django service."}, 503)
    payload = {"type": "email" if kind == "email" else "sms", "token": code, kind: value}
    try:
        response = requests.post(
            settings.SUPABASE_URL + "/auth/v1/verify",
            headers={"apikey": settings.SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json=payload, timeout=12,
        )
    except requests.RequestException:
        return j({"error": "Could not contact Supabase Auth. Please try again."}, 502)
    if response.status_code >= 400:
        return j({"error": "That verification code is invalid or expired. Request a new code."}, 401)
    try:
        result = response.json()
    except ValueError:
        return j({"error": "Supabase Auth returned an invalid response."}, 502)
    user = result.get("user") or {}
    user_id = clean(user.get("id"), 80)
    if not user_id:
        return j({"error": "Supabase did not return a verified account."}, 502)
    metadata = user.get("user_metadata") or {}
    submitted_name = clean(body.get("name"), 160)
    verified_email = clean(user.get("email"), 180).lower() or (value if kind == "email" else "")
    verified_phone = clean(user.get("phone"), 30) or (value if kind == "phone" else "")
    try:
        profile = CustomerProfile.objects.filter(supabase_user_id=user_id).first()
        if profile is None:
            lookup = Q()
            if verified_email:
                lookup |= Q(email__iexact=verified_email)
            if verified_phone:
                lookup |= Q(phone=verified_phone)
            profile = CustomerProfile.objects.filter(lookup).first() if lookup else None
        if profile is None:
            profile = CustomerProfile(supabase_user_id=user_id)
        profile.supabase_user_id = user_id
        profile.email = verified_email or profile.email
        profile.phone = verified_phone or profile.phone
        profile.name = profile.name or submitted_name or clean(metadata.get("full_name") or metadata.get("name"), 160) or (
            verified_email.split("@")[0] if verified_email else "Gwizineza customer"
        )
        profile.avatar_url = clean(metadata.get("avatar_url"), 1000) or profile.avatar_url
        profile.save()
    except IntegrityError:
        return j({"error": "Could not link this Supabase account to a customer profile. Contact support."}, 409)

    response = j({"ok": True, "customer": customer_dto(profile), "message": "You are signed in."})
    response.set_cookie(
        "gwizineza_customer_session",
        signing.dumps(str(profile.id), salt="gwizineza-customer"),
        max_age=60 * 60 * 24 * 30, httponly=True, secure=not settings.DEBUG,
        samesite="Lax", path="/",
    )
    return response


def send_textbee_hook(request):
    secret = settings.SUPABASE_SEND_SMS_HOOK_SECRET
    api_key = settings.TEXTBEE_API_KEY
    if not secret or not api_key:
        return j({"error": "TextBee SMS hook is not configured"}, 503)
    raw = request.body
    hook_id = request.headers.get("Webhook-Id", "")
    stamp = request.headers.get("Webhook-Timestamp", "")
    signatures = request.headers.get("Webhook-Signature", "")
    try:
        if abs(time.time() - int(stamp)) > 300:
            return j({"error": "Expired SMS hook signature"}, 401)
    except (TypeError, ValueError):
        return j({"error": "Invalid SMS hook timestamp"}, 401)
    import base64
    valid = False
    signed_payload = hook_id.encode() + b"." + stamp.encode() + b"." + raw
    presented_signatures = [
        item.split(",", 1)[1]
        for item in signatures.split()
        if item.startswith("v1,") and "," in item
    ]
    # Supabase supports key rotation with secrets separated by "|". Its current
    # Standard Webhooks format is v1,whsec_<base64>; tolerate a bare whsec_ key
    # too, but never fall back to accepting an unsigned request.
    for configured_secret in secret.split("|"):
        candidate = configured_secret.strip()
        if candidate.startswith("v1,"):
            candidate = candidate.split(",", 1)[1]
        if candidate.startswith("whsec_"):
            candidate = candidate[len("whsec_"):]
        try:
            key_bytes = base64.b64decode(candidate, validate=True)
        except (ValueError, TypeError):
            continue
        expected = base64.b64encode(hmac.new(key_bytes, signed_payload, hashlib.sha256).digest()).decode()
        if any(hmac.compare_digest(item, expected) for item in presented_signatures):
            valid = True
            break
    if not valid:
        return j({"error": "Invalid Supabase Auth hook signature"}, 401)
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return j({"error": "Invalid JSON payload"}, 400)
    phone = clean((payload.get("user") or {}).get("phone"), 30)
    otp = clean((payload.get("sms") or {}).get("otp"), 12)
    if not phone or not otp:
        return j({"error": "Phone number and OTP are required"}, 400)
    message = "Gwizineza Market verification code: " + otp + ". Do not share this code with anyone."
    data = {"recipients": [phone], "message": message}
    if settings.TEXTBEE_DEVICE_ID:
        data["deviceId"] = settings.TEXTBEE_DEVICE_ID
    try:
        sent = requests.post(
            "https://api.textbee.dev/api/v1/gateway/send-sms",
            headers={"Content-Type": "application/json", "x-api-key": api_key},
            json=data, timeout=12,
        )
    except requests.RequestException:
        return j({"error": "SMS provider failed to send the OTP"}, 502)
    if not sent.ok:
        return j({"error": "SMS provider failed to send the OTP"}, 502)
    return HttpResponse(status=200)


def product_from_path(path):
    identifier = path.split("/", 1)[1] if "/" in path else ""
    qs = Product.objects.select_related("category", "seller").prefetch_related("images")
    # Do not send arbitrary slugs through the UUID database field: PostgreSQL
    # correctly rejects a non-UUID value before the OR query can match the slug.
    if re.fullmatch(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}", identifier):
        return qs.filter(Q(id=identifier) | Q(slug=identifier)).first()
    return qs.filter(slug=identifier).first()


def handle_upload(request, path):
    blocked = require_admin(request) if path == "admin/image-upload" else None
    seller = None
    if path == "seller/image-upload":
        seller, blocked = require_seller(request)
    if blocked:
        return blocked
    upload = request.FILES.get("file") or request.FILES.get("image")
    if not upload:
        return j({"error": "Choose an image file to upload."}, 400)
    if not upload.content_type or not upload.content_type.startswith("image/"):
        return j({"error": "Only image files are allowed."}, 400)
    if upload.size > 8 * 1024 * 1024:
        return j({"error": "Image must be 8 MB or smaller."}, 400)
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return j({"error": "Supabase Storage is not configured on the backend."}, 503)
    bucket = settings.SUPABASE_STORAGE_BUCKET or "product-images"
    extension = upload.name.rsplit(".", 1)[-1].lower() if "." in upload.name else "jpg"
    extension = extension if re.fullmatch(r"[a-z0-9]{1,8}", extension) else "jpg"
    key = "products/" + uuid.uuid4().hex + "." + extension
    base = settings.SUPABASE_URL.rstrip("/")
    headers = {
        "Authorization": "Bearer " + settings.SUPABASE_SERVICE_ROLE_KEY,
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": upload.content_type,
        "x-upsert": "false",
        "cache-control": "31536000",
    }
    try:
        result = requests.post(
            base + "/storage/v1/object/" + quote(bucket, safe="") + "/" + key,
            headers=headers, data=upload.read(), timeout=30,
        )
    except requests.RequestException:
        return j({"error": "Supabase Storage is unavailable."}, 502)
    if not result.ok:
        return j({"error": "Image upload failed. Check the Supabase Storage bucket and service key."}, 502)
    url = base + "/storage/v1/object/public/" + quote(bucket, safe="") + "/" + key
    return j({"url": url, "path": key, "bucket": bucket}, 201)


def handle_product_images(request, path):
    seller = None
    admin = path == "product-images"
    if admin:
        blocked = require_admin(request)
    else:
        seller, blocked = require_seller(request)
    if blocked:
        return blocked
    if request.method == "GET":
        product_id = clean(request.GET.get("productId"), 80)
        if not product_id:
            return j({"error": "productId is required"}, 400)
        product = Product.objects.filter(id=product_id).first()
        if not product:
            return j({"error": "Product not found"}, 404)
        if seller and product.seller_id != seller.id:
            return j({"error": "Product not found for this seller"}, 404)
        images = list(product.images.all())
        return j({"images": [{
            "id": str(i.id), "productId": str(i.product_id), "url": i.url,
            "altText": i.alt_text, "sortOrder": i.sort_order, "isPrimary": i.is_primary,
            "createdAt": iso(i.created_at),
        } for i in images]})
    body = read_body(request)
    if request.method == "POST":
        product_id = clean(body.get("productId"), 80)
        url = clean(body.get("url"), 1000)
        product = Product.objects.filter(id=product_id).first()
        if not product or (seller and product.seller_id != seller.id):
            return j({"error": "Product not found for this account"}, 404)
        if not url.startswith(("https://", "http://", "/")):
            return j({"error": "A valid image URL is required"}, 400)
        make_primary = bool(body.get("isPrimary")) or not product.images.exists()
        with transaction.atomic():
            if make_primary:
                product.images.update(is_primary=False)
            image = ProductImage.objects.create(
                product=product, url=url, alt_text=clean(body.get("altText"), 240) or None,
                sort_order=max(0, int(body.get("sortOrder") or 0)), is_primary=make_primary,
            )
            if make_primary:
                product.image_url = url
                product.save(update_fields=["image_url", "updated_at"])
        return j({"image": {"id": str(image.id), "productId": str(product.id), "url": image.url,
                            "altText": image.alt_text, "sortOrder": image.sort_order, "isPrimary": image.is_primary}}, 201)
    if request.method == "PATCH":
        image_id = clean(body.get("id"), 80)
        image = ProductImage.objects.select_related("product").filter(id=image_id).first()
        if not image or (seller and image.product.seller_id != seller.id):
            return j({"error": "Image not found"}, 404)
        if "url" in body:
            image.url = clean(body.get("url"), 1000)
        if "altText" in body:
            image.alt_text = clean(body.get("altText"), 240) or None
        if "sortOrder" in body:
            image.sort_order = max(0, int(body.get("sortOrder") or 0))
        if body.get("isPrimary"):
            image.product.images.update(is_primary=False)
            image.is_primary = True
            image.product.image_url = image.url
            image.product.save(update_fields=["image_url", "updated_at"])
        image.save()
        return j({"image": {"id": str(image.id), "productId": str(image.product_id), "url": image.url,
                            "altText": image.alt_text, "sortOrder": image.sort_order, "isPrimary": image.is_primary}})
    if request.method == "DELETE":
        image_id = clean(request.GET.get("id") or body.get("id"), 80)
        image = ProductImage.objects.select_related("product").filter(id=image_id).first()
        if not image or (seller and image.product.seller_id != seller.id):
            return j({"error": "Image not found"}, 404)
        product = image.product
        was_primary = image.is_primary
        image.delete()
        if was_primary:
            next_image = product.images.order_by("sort_order", "created_at").first()
            if next_image:
                next_image.is_primary = True
                next_image.save(update_fields=["is_primary", "updated_at"])
                product.image_url = next_image.url
            else:
                product.image_url = None
            product.save(update_fields=["image_url", "updated_at"])
        return j({"ok": True})
    return j({"error": "Method not allowed"}, 405)


@csrf_exempt
def api_dispatch(request, resource=""):
    path = (resource or "").strip("/")
    method = request.method.upper()
    if method not in {"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"}:
        return j({"error": "Method not allowed"}, 405)
    if method == "OPTIONS":
        return HttpResponse(status=204)
    if method not in {"GET", "HEAD"} and not same_origin_guard(request):
        return j({"error": "Cross-origin request blocked"}, 403)
    body = read_body(request)

    if path == "health" and method in {"GET", "HEAD"}:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            db_status = "ok"
        except Exception:
            db_status = "unavailable"
        return j({"ok": db_status == "ok", "backend": "Django",
                  "database": "Supabase PostgreSQL", "databaseStatus": db_status,
                  "time": iso(timezone.now())}, 200 if db_status == "ok" else 503)

    if path in {"auth/send-sms-hook"} and method == "POST":
        return send_textbee_hook(request)

    if path in {"customer/auth/otp/send", "customer/auth/register", "customer/auth/login"} and method == "POST":
        # Register and login are OTP request aliases for old links; no password auth exists.
        return send_customer_otp(request, body)
    if path in {"customer/auth/otp/verify", "customer/auth/verify"} and method == "POST":
        return verify_customer_otp(request, body)
    if path.startswith("customer/auth/google"):
        return j({"error": "Google login has been replaced by email or phone OTP sign-in."}, 410)
    if path == "customer/auth/logout" and method == "POST":
        response = j({"ok": True})
        response.delete_cookie("gwizineza_customer_session", path="/", samesite="Lax")
        return response

    if path == "customer/me" or path == "customer/account":
        profile, error = require_customer(request)
        if error:
            return error
        if method == "GET":
            return j({"customer": customer_dto(profile)})
        if method == "PATCH":
            if "name" in body:
                new_name = clean(body.get("name"), 160)
                if len(new_name) < 2:
                    return j({"error": "Name must be at least 2 characters"}, 400)
                profile.name = new_name
            if "phone" in body:
                kind, value = normalize_contact(body.get("phone"))
                if not kind or kind != "phone":
                    return j({"error": "Enter a valid phone number"}, 400)
                if CustomerProfile.objects.filter(phone=value).exclude(id=profile.id).exists():
                    return j({"error": "Phone number is already linked to another account"}, 409)
                profile.phone = value
            if "email" in body:
                kind, value = normalize_contact(body.get("email"))
                if not kind or kind != "email":
                    return j({"error": "Enter a valid email address"}, 400)
                if CustomerProfile.objects.filter(email__iexact=value).exclude(id=profile.id).exists():
                    return j({"error": "Email is already linked to another account"}, 409)
                profile.email = value
            profile.save()
            return j({"ok": True, "customer": customer_dto(profile)})
        return j({"error": "Method not allowed"}, 405)

    if path == "admin/login" and method == "POST":
        submitted = clean(body.get("password"), 300)
        if not settings.ADMIN_PASSWORD:
            return j({"error": "ADMIN_PASSWORD is not configured on the Django service."}, 503)
        if not submitted or not secrets.compare_digest(submitted, settings.ADMIN_PASSWORD):
            return j({"error": "Incorrect owner password"}, 401)
        response = j({"ok": True})
        response.set_cookie("gwizineza_admin_session", signing.dumps({"role": "admin"}, salt="gwizineza-admin"),
                            max_age=86400, httponly=True, secure=not settings.DEBUG, samesite="Lax", path="/")
        return response
    if path == "admin/logout" and method == "POST":
        response = j({"ok": True})
        response.delete_cookie("gwizineza_admin_session", path="/", samesite="Lax")
        return response

    if path == "seller/auth/login" and method == "POST":
        username = clean(body.get("username"), 80)
        password = body.get("password") if isinstance(body.get("password"), str) else ""
        seller = Seller.objects.filter(login_username__iexact=username).first()
        if not seller or not seller.password_hash or not check_password(password, seller.password_hash):
            return j({"error": "Invalid seller username or password"}, 401)
        if seller.status != Seller.Status.APPROVED:
            return j({"error": "This seller account is not active. Contact the owner."}, 403)
        response = j({"ok": True, "seller": seller_dto(seller, private=True)})
        response.set_cookie("gwizineza_seller_session", signing.dumps(str(seller.id), salt="gwizineza-seller"),
                            max_age=86400, httponly=True, secure=not settings.DEBUG, samesite="Lax", path="/")
        return response
    if path == "seller/auth/logout" and method == "POST":
        response = j({"ok": True})
        response.delete_cookie("gwizineza_seller_session", path="/", samesite="Lax")
        return response

    if path == "site/settings" and method == "GET":
        row, _ = SiteSettings.objects.get_or_create(key="site", defaults={
            "site_name": "Gwizineza Market", "location": "Kabarondo, Rwanda",
            "footer_credit": "Created by Mucyo Pacifique",
        })
        result = settings_defaults()
        result.update(settings_dto(row))
        return j({"settings": result})

    if path in {"products", "products/"}:
        if method == "GET":
            admin = request.GET.get("admin") == "true"
            if admin and not admin_id(request):
                return j({"error": "Admin authentication required"}, 401)
            result = public_products(request.GET, include_inactive=admin)
            if not request.GET.get("page") and not request.GET.get("pageSize"):
                return j({"products": result["products"]})
            return j(result)
        if method == "POST":
            blocked = require_admin(request)
            if blocked:
                return blocked
            sku, name = clean(body.get("sku"), 80), clean(body.get("name"), 180)
            product_slug = slugify(clean(body.get("slug") or name, 200))
            try:
                price, stock = int(body.get("priceRwf")), int(body.get("stock", 0))
            except (ValueError, TypeError):
                return j({"error": "priceRwf and stock must be non-negative integers"}, 400)
            if not sku or len(name) < 2 or not product_slug or price < 0 or stock < 0:
                return j({"error": "sku, name, slug, priceRwf and stock are required"}, 400)
            seller = Seller.objects.filter(id=body.get("sellerId"), status=Seller.Status.APPROVED).first() if body.get("sellerId") else None
            if body.get("sellerId") and not seller:
                return j({"error": "Seller must be approved before receiving products"}, 409)
            category = Category.objects.filter(id=body.get("categoryId")).first() if body.get("categoryId") else None
            try:
                product = Product.objects.create(
                    sku=sku, name=name, slug=product_slug, description=clean(body.get("description"), 5000) or None,
                    price_rwf=price, stock=stock, image_url=clean(body.get("imageUrl"), 1000) or None,
                    category=category, seller=seller,
                    compare_at_price_rwf=body.get("compareAtPriceRwf") or None,
                    is_featured=bool(body.get("isFeatured", False)),
                    display_section=clean(body.get("displaySection"), 80) or None,
                    display_priority=body.get("displayPriority"),
                )
            except IntegrityError:
                return j({"error": "SKU or product slug already exists"}, 409)
            return j({"product": product_dto(product)}, 201)

    if path.startswith("products/") and method in {"GET", "PATCH", "PUT", "DELETE"}:
        product = product_from_path(path)
        if not product:
            return j({"error": "Product not found"}, 404)
        if method == "GET":
            if not product.is_active or (product.seller_id and product.seller.status != Seller.Status.APPROVED):
                return j({"error": "Product not found"}, 404)
            return j({"product": product_dto(product)})
        blocked = require_admin(request)
        if blocked:
            return blocked
        if method == "DELETE":
            product.is_active = False
            product.save(update_fields=["is_active", "updated_at"])
            return j({"ok": True})
        allowed = {
            "sku": "sku", "name": "name", "slug": "slug", "description": "description",
            "priceRwf": "price_rwf", "stock": "stock", "imageUrl": "image_url",
            "isActive": "is_active", "isFeatured": "is_featured",
            "displaySection": "display_section", "displayPriority": "display_priority",
            "compareAtPriceRwf": "compare_at_price_rwf",
        }
        for input_key, field in allowed.items():
            if input_key in body:
                setattr(product, field, body[input_key] if input_key != "slug" else slugify(clean(body[input_key], 200)))
        if "categoryId" in body:
            product.category = Category.objects.filter(id=body.get("categoryId")).first() if body.get("categoryId") else None
        if "sellerId" in body:
            product.seller = Seller.objects.filter(id=body.get("sellerId"), status=Seller.Status.APPROVED).first() if body.get("sellerId") else None
        try:
            product.save()
        except (IntegrityError, ValueError, TypeError):
            return j({"error": "Product update failed. Check unique fields and field values."}, 400)
        return j({"product": product_dto(product)})

    if path == "categories":
        if method == "GET":
            return j({"categories": [category_dto(c) for c in Category.objects.all()]})
        if method in {"POST", "PATCH"}:
            blocked = require_admin(request)
            if blocked:
                return blocked
            name = clean(body.get("name"), 100)
            category_slug = slugify(clean(body.get("slug") or name, 120))
            if method == "POST":
                if len(name) < 2 or not category_slug:
                    return j({"error": "Category name is required"}, 400)
                try:
                    category = Category.objects.create(name=name, slug=category_slug)
                except IntegrityError:
                    return j({"error": "Category name or slug already exists"}, 409)
                return j({"category": category_dto(category)}, 201)
            category = Category.objects.filter(id=body.get("id")).first()
            if not category:
                return j({"error": "Category not found"}, 404)
            if name:
                category.name = name
            if category_slug:
                category.slug = category_slug
            try:
                category.save()
            except IntegrityError:
                return j({"error": "Category name or slug already exists"}, 409)
            return j({"category": category_dto(category)})

    if path == "cart":
        if method == "GET":
            cart_id = clean(request.GET.get("cartId"), 64)
            if not cart_id:
                return j({"error": "cartId is required"}, 400)
            cart = Cart.objects.filter(id=cart_id).first()
            if not cart:
                return j({"cart": {"id": cart_id, "items": [], "subtotalRwf": 0}})
            items = list(cart.items.select_related("product", "product__seller", "product__category").prefetch_related("product__images"))
            subtotal = sum(item.quantity * item.product.price_rwf for item in items)
            return j({"cart": {"id": cart_id, "items": [{
                "id": str(i.id), "cartId": i.cart_id, "productId": str(i.product_id), "quantity": i.quantity,
                "product": product_dto(i.product),
            } for i in items], "subtotalRwf": subtotal}})
        if method == "POST":
            cart_id, product_id = clean(body.get("cartId"), 64), clean(body.get("productId"), 80)
            try:
                quantity = int(body.get("quantity"))
            except (ValueError, TypeError):
                quantity = 0
            if not cart_id or not product_id or quantity < 1:
                return j({"error": "cartId, productId and positive quantity are required"}, 400)
            product = Product.objects.filter(id=product_id, is_active=True).first()
            if not product:
                return j({"error": "Product not found"}, 404)
            if quantity > product.stock:
                return j({"error": "Not enough stock"}, 409)
            cart, _ = Cart.objects.get_or_create(id=cart_id)
            item, created = CartItem.objects.update_or_create(cart=cart, product=product, defaults={"quantity": quantity})
            return j({"item": {"id": str(item.id), "cartId": cart_id, "productId": str(product.id), "quantity": item.quantity,
                               "product": product_dto(product)}}, 201 if created else 200)
        if method == "DELETE":
            cart_id = clean(body.get("cartId") or request.GET.get("cartId"), 64)
            product_id = clean(body.get("productId") or request.GET.get("productId"), 80)
            if not cart_id or not product_id:
                return j({"error": "cartId and productId are required"}, 400)
            CartItem.objects.filter(cart_id=cart_id, product_id=product_id).delete()
            return j({"ok": True})

    if path == "checkout" and method == "POST":
        cart_id = clean(body.get("cartId"), 64)
        customer_name = clean(body.get("customerName"), 160)
        phone_kind, phone = normalize_contact(body.get("phone"))
        address = clean(body.get("deliveryAddress"), 700)
        email_kind, customer_email = normalize_contact(body.get("customerEmail"))
        if not cart_id or len(customer_name) < 2 or phone_kind != "phone" or len(address) < 3:
            return j({"error": "Cart, full name, valid phone and delivery address are required"}, 400)
        if body.get("customerEmail") and email_kind != "email":
            return j({"error": "Enter a valid email address or leave it empty"}, 400)
        profile = customer_for_request(request)
        zone_id = clean(body.get("deliveryZoneId"), 80)
        payment_method = clean(body.get("paymentMethod"), 12).upper() or "COD"
        if payment_method not in PaymentRecord.Method.values:
            return j({"error": "Unsupported payment method"}, 400)
        try:
            with transaction.atomic():
                cart = Cart.objects.select_for_update().filter(id=cart_id).first()
                if not cart:
                    return j({"error": "Your cart is empty"}, 400)
                cart_items = list(cart.items.select_related("product", "product__seller").all())
                if not cart_items:
                    return j({"error": "Your cart is empty"}, 400)
                products = {}
                subtotal = 0
                for cart_item in cart_items:
                    product = Product.objects.select_for_update().filter(
                        id=cart_item.product_id, is_active=True, stock__gte=cart_item.quantity
                    ).first()
                    if not product:
                        return j({"error": "Not enough stock for " + cart_item.product.name}, 409)
                    products[str(product.id)] = product
                    subtotal += product.price_rwf * cart_item.quantity
                delivery = 0
                if zone_id:
                    zone = DeliveryZone.objects.filter(id=zone_id, active=True).first()
                    if not zone:
                        return j({"error": "Selected delivery zone is unavailable"}, 400)
                    delivery = zone.fee_rwf
                order = StoreOrder.objects.create(
                    order_number="GW-" + timezone.now().strftime("%Y%m%d") + "-" + uuid.uuid4().hex[:8].upper(),
                    customer_name=customer_name, phone=phone, customer_email=customer_email if email_kind == "email" else None,
                    customer=profile, delivery_address=address, subtotal_rwf=subtotal,
                    delivery_rwf=delivery, total_rwf=subtotal + delivery, status=StoreOrder.Status.ORDERED,
                )
                for cart_item in cart_items:
                    product = products[str(cart_item.product_id)]
                    product.stock -= cart_item.quantity
                    product.save(update_fields=["stock", "updated_at"])
                    StoreOrderItem.objects.create(
                        order=order, product=product, seller=product.seller, product_name=product.name,
                        unit_price_rwf=product.price_rwf, quantity=cart_item.quantity,
                        line_total_rwf=product.price_rwf * cart_item.quantity,
                    )
                PaymentRecord.objects.create(order=order, method=payment_method, amount_rwf=order.total_rwf)
                CartItem.objects.filter(cart=cart).delete()
            order.refresh_from_db()
            return j({"order": order_dto(order)}, 201)
        except Exception:
            return j({"error": "We could not place the order. Please retry or contact support."}, 500)

    if path.startswith("orders/") and method == "GET":
        order_number = path.split("/", 1)[1]
        order = StoreOrder.objects.filter(order_number=order_number).first()
        if not order:
            return j({"error": "Order not found"}, 404)
        profile = customer_for_request(request)
        # Guest checkout can still use the order number; authenticated owners get scoped access.
        if profile and order.customer_id and order.customer_id != profile.id:
            return j({"error": "Order not found"}, 404)
        return j({"order": order_dto(order)})

    if path == "customer/orders" and method == "GET":
        profile, error = require_customer(request)
        if error:
            return error
        orders = StoreOrder.objects.filter(customer=profile).prefetch_related("items__product").select_related("payment")
        return j({"orders": [order_dto(order) for order in orders]})

    if path in {"sellers", "sellers/"}:
        if method == "GET":
            admin = request.GET.get("admin") == "true"
            if admin:
                blocked = require_admin(request)
                if blocked:
                    return blocked
                qs = Seller.objects.all()
                return j({"sellers": [seller_dto(s, private=True) for s in qs]})
            qs = Seller.objects.filter(status=Seller.Status.APPROVED)
            result = []
            for seller in qs:
                prods = public_products({"seller": str(seller.id), "pageSize": "8"})["products"]
                result.append({**seller_dto(seller), "products": prods, "since": iso(seller.created_at)})
            return j({"sellers": result})
        if method == "POST":
            blocked = require_admin(request)
            if blocked:
                return blocked
            business = clean(body.get("businessName"), 160)
            owner = clean(body.get("ownerName"), 160)
            phone_kind, phone = normalize_contact(body.get("phone"))
            email_kind, email = normalize_contact(body.get("email"))
            username = clean(body.get("loginUsername") or body.get("username"), 80)
            password = body.get("password") if isinstance(body.get("password"), str) else ""
            if len(business) < 2 or len(owner) < 2 or phone_kind != "phone" or not username or len(password) < 8:
                return j({"error": "Business, owner, valid phone, username and a password of at least 8 characters are required"}, 400)
            try:
                seller = Seller.objects.create(
                    business_name=business, owner_name=owner, phone=phone,
                    email=email if email_kind == "email" else None, address=clean(body.get("address"), 300) or None,
                    login_username=username, password_hash=make_password(password), status=Seller.Status.APPROVED,
                )
            except IntegrityError:
                return j({"error": "That seller username already exists"}, 409)
            return j({"seller": seller_dto(seller, private=True)}, 201)
        if method == "PATCH":
            blocked = require_admin(request)
            if blocked:
                return blocked
            seller = Seller.objects.filter(id=body.get("id")).first()
            if not seller:
                return j({"error": "Seller not found"}, 404)
            if "status" in body and body["status"] in Seller.Status.values:
                seller.status = body["status"]
            elif body.get("action") == "suspend":
                seller.status = Seller.Status.SUSPENDED
            elif body.get("action") in {"approve", "activate"}:
                seller.status = Seller.Status.APPROVED
            for key, field in [("businessName", "business_name"), ("ownerName", "owner_name"), ("address", "address")]:
                if key in body:
                    setattr(seller, field, clean(body[key], 300) or None)
            if body.get("password"):
                if len(str(body["password"])) < 8:
                    return j({"error": "Password must be at least 8 characters"}, 400)
                seller.password_hash = make_password(str(body["password"]))
            seller.save()
            return j({"seller": seller_dto(seller, private=True)})

    if path == "seller/me":
        seller, error = require_seller(request)
        if error:
            return error
        if method == "GET":
            return j({"seller": seller_dto(seller, private=True)})
        if method == "PATCH":
            for key, field in [("businessName", "business_name"), ("ownerName", "owner_name"), ("phone", "phone"), ("email", "email"), ("address", "address")]:
                if key in body:
                    setattr(seller, field, clean(body[key], 300))
            seller.save()
            return j({"seller": seller_dto(seller, private=True)})

    if path == "seller/products":
        seller, error = require_seller(request)
        if error:
            return error
        qs = Product.objects.filter(seller=seller).select_related("category", "seller").prefetch_related("images")
        if method == "GET":
            return j({"products": [product_dto(p, True) for p in qs]})
        if method == "POST":
            sku, name = clean(body.get("sku"), 80), clean(body.get("name"), 180)
            product_slug = slugify(clean(body.get("slug") or name, 200))
            try:
                price, stock = int(body.get("priceRwf")), int(body.get("stock", 0))
            except (ValueError, TypeError):
                return j({"error": "Price and stock must be non-negative integers"}, 400)
            if not sku or len(name) < 2 or not product_slug or price < 0 or stock < 0:
                return j({"error": "sku, name, slug, priceRwf and stock are required"}, 400)
            category = Category.objects.filter(id=body.get("categoryId")).first() if body.get("categoryId") else None
            try:
                product = Product.objects.create(
                    sku=sku, name=name, slug=product_slug, description=clean(body.get("description"), 5000) or None,
                    price_rwf=price, stock=stock, image_url=clean(body.get("imageUrl"), 1000) or None,
                    category=category, seller=seller,
                    compare_at_price_rwf=body.get("compareAtPriceRwf") or None, is_active=True,
                )
            except IntegrityError:
                return j({"error": "SKU or product slug already exists"}, 409)
            return j({"product": product_dto(product, True)}, 201)
        if method == "PATCH":
            product = qs.filter(id=body.get("id")).first()
            if not product:
                return j({"error": "Product not found for this seller"}, 404)
            mapping = {"name": "name", "slug": "slug", "description": "description", "priceRwf": "price_rwf",
                       "stock": "stock", "imageUrl": "image_url", "isActive": "is_active", "compareAtPriceRwf": "compare_at_price_rwf"}
            for key, field in mapping.items():
                if key in body:
                    value = body[key]
                    if key == "slug":
                        value = slugify(clean(value, 200))
                    elif key in {"name", "description", "imageUrl"}:
                        value = clean(value, 1000) or (None if key != "name" else "")
                    setattr(product, field, value)
            if "categoryId" in body:
                product.category = Category.objects.filter(id=body.get("categoryId")).first() if body.get("categoryId") else None
            try:
                product.save()
            except (IntegrityError, ValueError, TypeError):
                return j({"error": "Product update failed"}, 400)
            return j({"product": product_dto(product, True)})

    if path == "seller/orders" and method == "GET":
        seller, error = require_seller(request)
        if error:
            return error
        qs = StoreOrder.objects.filter(items__seller=seller).distinct().prefetch_related("items__product").select_related("payment")
        return j({"orders": [order_dto(order, seller_id=seller.id) for order in qs]})

    if path == "seller/stats" and method == "GET":
        seller, error = require_seller(request)
        if error:
            return error
        products = Product.objects.filter(seller=seller)
        item_rows = StoreOrderItem.objects.filter(seller=seller, order__status__in=[StoreOrder.Status.PROCESSING, StoreOrder.Status.SHIPPED, StoreOrder.Status.DELIVERED])
        return j({
            "products": products.count(), "activeProducts": products.filter(is_active=True).count(),
            "lowStock": products.filter(stock__lte=5, is_active=True).count(),
            "orders": StoreOrder.objects.filter(items__seller=seller).distinct().count(),
            "revenueRwf": item_rows.filter(order__payment__status=PaymentRecord.Status.PAID).aggregate(total=Sum("line_total_rwf"))["total"] or 0,
            "unitsSold": item_rows.filter(order__status=StoreOrder.Status.DELIVERED).aggregate(total=Sum("quantity"))["total"] or 0,
        })

    if path == "admin/orders":
        blocked = require_admin(request)
        if blocked:
            return blocked
        if method == "GET":
            qs = StoreOrder.objects.all().prefetch_related("items__product").select_related("payment")
            state = clean(request.GET.get("status"), 20)
            if state:
                qs = qs.filter(status=state)
            return j({"orders": [order_dto(order) for order in qs]})
        if method == "PATCH":
            order = StoreOrder.objects.filter(Q(id=body.get("id")) | Q(order_number=body.get("orderNumber"))).first()
            status_value = clean(body.get("status"), 20).upper()
            if not order:
                return j({"error": "Order not found"}, 404)
            if status_value not in StoreOrder.Status.values:
                return j({"error": "Invalid order status"}, 400)
            order.status = status_value
            order.save(update_fields=["status", "updated_at"])
            return j({"order": order_dto(order)})

    if path == "admin/stats" and method == "GET":
        blocked = require_admin(request)
        if blocked:
            return blocked
        return j({
            "products": Product.objects.count(), "activeProducts": Product.objects.filter(is_active=True).count(),
            "categories": Category.objects.count(), "sellers": Seller.objects.count(),
            "activeSellers": Seller.objects.filter(status=Seller.Status.APPROVED).count(),
            "customers": CustomerProfile.objects.count(), "orders": StoreOrder.objects.count(),
            "pendingOrders": StoreOrder.objects.filter(status=StoreOrder.Status.ORDERED).count(),
            "revenueRwf": PaymentRecord.objects.filter(status=PaymentRecord.Status.PAID).aggregate(total=Sum("amount_rwf"))["total"] or 0,
        })

    if path == "admin/diagnostics/database" and method == "GET":
        blocked = require_admin(request)
        if blocked:
            return blocked
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return j({"ok": True, "database": "Supabase PostgreSQL", "status": "connected"})
        except Exception:
            return j({"ok": False, "database": "Supabase PostgreSQL", "status": "unavailable"}, 503)

    if path == "admin/customers" and method == "GET":
        blocked = require_admin(request)
        if blocked:
            return blocked
        customers = CustomerProfile.objects.annotate(order_count=Count("orders")).order_by("-created_at")
        return j({"customers": [{
            **customer_dto(c), "orderCount": c.order_count,
        } for c in customers]})

    if path == "admin/finance" and method == "GET":
        blocked = require_admin(request)
        if blocked:
            return blocked
        def sum_status(status):
            return PaymentRecord.objects.filter(status=status).aggregate(total=Sum("amount_rwf"))["total"] or 0
        return j({
            "paidRwf": sum_status(PaymentRecord.Status.PAID),
            "pendingRwf": sum_status(PaymentRecord.Status.PENDING),
            "refundedRwf": sum_status(PaymentRecord.Status.REFUNDED),
            "cancelledRwf": sum_status(PaymentRecord.Status.CANCELLED),
            "paymentCount": PaymentRecord.objects.count(),
            "providerIntegration": "not_configured",
        })

    if path == "admin/settings":
        blocked = require_admin(request)
        if blocked:
            return blocked
        if method == "GET":
            row, _ = SiteSettings.objects.get_or_create(key="site")
            result = settings_defaults()
            result.update(settings_dto(row))
            return j({"settings": result})
        if method == "PATCH":
            row, _ = SiteSettings.objects.get_or_create(key="site")
            fields = {
                "siteName": ("site_name", 120), "tagline": ("tagline", 240),
                "location": ("location", 180), "region": ("region", 240),
                "phone": ("phone", 40), "email": ("email", 180), "whatsapp": ("whatsapp", 40),
                "copyrightText": ("copyright_text", 160), "footerCredit": ("footer_credit", 160),
                "announcementText": ("announcement_text", 240),
            }
            for key, (field, limit) in fields.items():
                if key in body:
                    setattr(row, field, clean(body[key], limit))
            if "copyrightYear" in body:
                try:
                    year = int(body["copyrightYear"])
                    if not 2000 <= year <= 2100:
                        raise ValueError()
                    row.copyright_year = year
                except (ValueError, TypeError):
                    return j({"error": "Copyright year must be between 2000 and 2100"}, 400)
            if "announcementEnabled" in body:
                row.announcement_enabled = bool(body["announcementEnabled"])
            for key, field, low, high in [("mapLat", "map_lat", -90, 90), ("mapLng", "map_lng", -180, 180)]:
                if key in body:
                    try:
                        val = None if body[key] in (None, "") else float(body[key])
                        if val is not None and not low <= val <= high:
                            raise ValueError()
                        setattr(row, field, val)
                    except (ValueError, TypeError):
                        return j({"error": "Invalid map coordinates"}, 400)
            row.save()
            return j({"ok": True, "settings": settings_dto(row)})

    if path == "product-images" or path == "seller/product-images":
        return handle_product_images(request, path)

    if path == "admin/image-upload" or path == "seller/image-upload":
        if method == "POST":
            return handle_upload(request, path)

    if path == "delivery/zones":
        if method == "GET":
            zones = DeliveryZone.objects.filter(active=True) if not admin_id(request) else DeliveryZone.objects.all()
            if request.GET.get("admin") == "true":
                blocked = require_admin(request)
                if blocked:
                    return blocked
                zones = DeliveryZone.objects.all()
            return j({"zones": [{
                "id": str(z.id), "name": z.name, "feeRwf": z.fee_rwf,
                "etaMinDays": z.eta_min_days, "etaMaxDays": z.eta_max_days,
                "active": z.active, "createdAt": iso(z.created_at),
            } for z in zones]})
        blocked = require_admin(request)
        if blocked:
            return blocked
        if method == "POST":
            name = clean(body.get("name"), 120)
            if len(name) < 2:
                return j({"error": "Zone name is required"}, 400)
            try:
                zone = DeliveryZone.objects.create(name=name, fee_rwf=max(0, int(body.get("feeRwf") or 0)),
                                                   eta_min_days=max(1, int(body.get("etaMinDays") or 1)),
                                                   eta_max_days=max(1, int(body.get("etaMaxDays") or 3)),
                                                   active=body.get("active") is not False)
            except (ValueError, IntegrityError):
                return j({"error": "Could not create delivery zone"}, 409)
            return j({"zone": {"id": str(zone.id), "name": zone.name, "feeRwf": zone.fee_rwf,
                               "etaMinDays": zone.eta_min_days, "etaMaxDays": zone.eta_max_days, "active": zone.active}}, 201)
        if method == "PATCH":
            zone = DeliveryZone.objects.filter(id=body.get("id")).first()
            if not zone:
                return j({"error": "Delivery zone not found"}, 404)
            for key, field in [("name", "name"), ("feeRwf", "fee_rwf"), ("etaMinDays", "eta_min_days"), ("etaMaxDays", "eta_max_days"), ("active", "active")]:
                if key in body:
                    if key == "name":
                        setattr(zone, field, clean(body[key], 120))
                    elif key == "active":
                        setattr(zone, field, bool(body[key]))
                    else:
                        try:
                            setattr(zone, field, max(0 if key == "feeRwf" else 1, int(body[key])))
                        except (ValueError, TypeError):
                            return j({"error": "Invalid delivery zone value"}, 400)
            try:
                zone.save()
            except IntegrityError:
                return j({"error": "Delivery zone name already exists"}, 409)
            return j({"zone": {"id": str(zone.id), "name": zone.name, "feeRwf": zone.fee_rwf,
                               "etaMinDays": zone.eta_min_days, "etaMaxDays": zone.eta_max_days, "active": zone.active}})

    if path == "wishlist":
        profile, error = require_customer(request)
        if error:
            return error
        if method == "GET":
            items = WishlistItem.objects.filter(customer=profile).select_related("product", "product__category", "product__seller").prefetch_related("product__images")
            result = [{"id": str(item.id), "productId": str(item.product_id), "product": product_dto(item.product),
                       "createdAt": iso(item.created_at)} for item in items]
            return j({"items": result, "wishlistItems": result})
        product_id = clean(body.get("productId") or request.GET.get("productId"), 80)
        if method == "POST":
            product = Product.objects.filter(id=product_id, is_active=True).first()
            if not product:
                return j({"error": "Product not found"}, 404)
            item, _ = WishlistItem.objects.get_or_create(customer=profile, product=product)
            return j({"ok": True, "item": {"id": str(item.id), "productId": str(product.id)}}, 201)
        if method == "DELETE":
            WishlistItem.objects.filter(customer=profile, product_id=product_id).delete()
            return j({"ok": True})

    if path == "reviews":
        if method == "GET":
            qs = ProductReview.objects.filter(status=ProductReview.Status.PUBLISHED).select_related("customer")
            product_id = clean(request.GET.get("productId"), 80)
            if product_id:
                qs = qs.filter(product_id=product_id)
            rows = list(qs.order_by("-created_at")[:100])
            ratings = qs.aggregate(count=Count("id"), average=Avg("rating"))
            return j({"reviews": [{
                "id": str(r.id), "productId": str(r.product_id), "customerId": str(r.customer_id) if r.customer_id else None,
                "customerName": r.customer.name if r.customer else "Customer", "rating": r.rating,
                "title": r.title, "body": r.body, "verified": r.verified, "createdAt": iso(r.created_at),
            } for r in rows], "summary": {"count": ratings["count"] or 0, "average": float(ratings["average"] or 0)}})
        if method == "POST":
            profile, error = require_customer(request)
            if error:
                return error
            product = Product.objects.filter(id=body.get("productId")).first()
            try:
                rating = int(body.get("rating"))
            except (TypeError, ValueError):
                rating = 0
            if not product or rating < 1 or rating > 5:
                return j({"error": "Choose a product and a rating from 1 to 5"}, 400)
            delivered_order = StoreOrder.objects.filter(customer=profile, status=StoreOrder.Status.DELIVERED, items__product=product).first()
            review = ProductReview.objects.create(product=product, customer=profile, order=delivered_order, rating=rating,
                                                  title=clean(body.get("title"), 180) or None,
                                                  body=clean(body.get("body"), 4000) or None,
                                                  verified=bool(delivered_order),
                                                  status=ProductReview.Status.PENDING)
            return j({"review": {"id": str(review.id), "status": review.status, "verified": review.verified},
                      "message": "Review submitted for moderation."}, 201)

    if path == "admin/reviews":
        blocked = require_admin(request)
        if blocked:
            return blocked
        if method == "GET":
            qs = ProductReview.objects.select_related("product", "customer").order_by("-created_at")
            return j({"reviews": [{
                "id": str(r.id), "productId": str(r.product_id), "productName": r.product.name,
                "customerName": r.customer.name if r.customer else "Customer", "rating": r.rating,
                "title": r.title, "body": r.body, "status": r.status, "verified": r.verified,
                "createdAt": iso(r.created_at),
            } for r in qs[:500]]})
        if method == "PATCH":
            review = ProductReview.objects.filter(id=body.get("id")).first()
            status_value = clean(body.get("status"), 12).upper()
            if not review or status_value not in ProductReview.Status.values:
                return j({"error": "Review or moderation status is invalid"}, 400)
            review.status = status_value
            review.save(update_fields=["status", "updated_at"])
            return j({"ok": True, "status": review.status})

    if path == "support/tickets":
        if method == "GET":
            profile = customer_for_request(request)
            qs = SupportTicket.objects.filter(customer=profile) if profile else SupportTicket.objects.none()
            return j({"tickets": [{
                "id": str(t.id), "subject": t.subject, "message": t.message, "status": t.status,
                "priority": t.priority, "email": t.email, "phone": t.phone, "createdAt": iso(t.created_at),
            } for t in qs.order_by("-created_at")]})
        if method == "POST":
            profile = customer_for_request(request)
            subject, message = clean(body.get("subject"), 180), clean(body.get("message"), 5000)
            if len(subject) < 2 or len(message) < 5:
                return j({"error": "Subject and a message of at least 5 characters are required"}, 400)
            ticket = SupportTicket.objects.create(customer=profile, subject=subject, message=message,
                                                  email=clean(body.get("email"), 180) or (profile.email if profile else None),
                                                  phone=clean(body.get("phone"), 30) or (profile.phone if profile else None))
            return j({"ticket": {"id": str(ticket.id), "status": ticket.status}, "ok": True}, 201)

    if path == "admin/support":
        blocked = require_admin(request)
        if blocked:
            return blocked
        if method == "GET":
            qs = SupportTicket.objects.select_related("customer", "seller").order_by("-created_at")
            return j({"tickets": [{
                "id": str(t.id), "subject": t.subject, "message": t.message, "status": t.status,
                "priority": t.priority, "email": t.email, "phone": t.phone,
                "customerName": t.customer.name if t.customer else None, "createdAt": iso(t.created_at),
            } for t in qs[:500]]})
        if method == "PATCH":
            ticket = SupportTicket.objects.filter(id=body.get("id")).first()
            if not ticket:
                return j({"error": "Support ticket not found"}, 404)
            if body.get("status") in SupportTicket.Status.values:
                ticket.status = body["status"]
            if body.get("priority") in SupportTicket.Priority.values:
                ticket.priority = body["priority"]
            ticket.save()
            return j({"ok": True, "ticket": {"id": str(ticket.id), "status": ticket.status, "priority": ticket.priority}})

    if path == "content":
        if method == "GET":
            admin = request.GET.get("admin") == "true"
            if admin:
                blocked = require_admin(request)
                if blocked:
                    return blocked
            qs = ContentPost.objects.all() if admin else ContentPost.objects.filter(status=ContentPost.Status.PUBLISHED)
            return j({"posts": [{
                "id": str(p.id), "slug": p.slug, "title": p.title, "excerpt": p.excerpt,
                "body": p.body, "coverImage": p.cover_image, "status": p.status,
                "publishedAt": iso(p.published_at), "createdAt": iso(p.created_at),
            } for p in qs.order_by("-created_at")[:200]]})
        if method in {"POST", "PATCH"}:
            blocked = require_admin(request)
            if blocked:
                return blocked
            if method == "POST":
                title = clean(body.get("title"), 200)
                post_slug = slugify(clean(body.get("slug") or title, 200))
                if len(title) < 2 or not post_slug:
                    return j({"error": "Title and slug are required"}, 400)
                try:
                    post = ContentPost.objects.create(
                        title=title, slug=post_slug, excerpt=clean(body.get("excerpt"), 500) or None,
                        body=clean(body.get("body"), 30000), cover_image=clean(body.get("coverImage"), 1000) or None,
                        status=ContentPost.Status.PUBLISHED if body.get("status") == "PUBLISHED" else ContentPost.Status.DRAFT,
                        published_at=timezone.now() if body.get("status") == "PUBLISHED" else None,
                    )
                except IntegrityError:
                    return j({"error": "Content slug already exists"}, 409)
                return j({"id": str(post.id), "slug": post.slug, "status": post.status}, 201)
            post = ContentPost.objects.filter(id=body.get("id")).first()
            if not post:
                return j({"error": "Content post not found"}, 404)
            for key, field, limit in [("title", "title", 200), ("excerpt", "excerpt", 500), ("body", "body", 30000), ("coverImage", "cover_image", 1000)]:
                if key in body:
                    setattr(post, field, clean(body[key], limit))
            if "slug" in body:
                post.slug = slugify(clean(body["slug"], 200))
            if "status" in body and body["status"] in ContentPost.Status.values:
                post.status = body["status"]
                post.published_at = timezone.now() if post.status == ContentPost.Status.PUBLISHED else None
            try:
                post.save()
            except IntegrityError:
                return j({"error": "Content slug already exists"}, 409)
            return j({"ok": True, "id": str(post.id), "slug": post.slug, "status": post.status})

    if path == "payments":
        if method == "GET":
            if admin_id(request):
                qs = PaymentRecord.objects.select_related("order").order_by("-created_at")
            else:
                profile, error = require_customer(request)
                if error:
                    return error
                qs = PaymentRecord.objects.filter(order__customer=profile).select_related("order").order_by("-created_at")
            return j({"payments": [{
                **payment_dto(p), "orderNumber": p.order.order_number,
            } for p in qs[:500]], "providerIntegration": "not_configured"})
        if method == "POST":
            profile, error = require_customer(request)
            if error:
                return error
            order = StoreOrder.objects.filter(order_number=body.get("orderNumber"), customer=profile).first()
            if not order:
                return j({"error": "Order not found"}, 404)
            return j({"payment": payment_dto(order.payment), "providerIntegration": "not_configured",
                      "message": "Online payment is not active. The order is awaiting payment by an enabled method."}, 202)
        if method == "PATCH":
            blocked = require_admin(request)
            if blocked:
                return blocked
            payment = PaymentRecord.objects.filter(Q(id=body.get("id")) | Q(order__order_number=body.get("orderNumber"))).first()
            status_value = clean(body.get("status"), 12).upper()
            if not payment or status_value not in PaymentRecord.Status.values:
                return j({"error": "Payment or payment status is invalid"}, 400)
            # Never mark a remote transaction as paid without a verified provider webhook.
            if status_value == PaymentRecord.Status.PAID and not body.get("verifiedProviderReference"):
                return j({"error": "A verified provider reference is required to mark an online payment as paid"}, 409)
            payment.status = status_value
            if body.get("providerRef"):
                payment.provider_ref = clean(body.get("providerRef"), 180)
            payment.save()
            return j({"payment": payment_dto(payment)})

    if path.startswith("seller/") and path not in {"seller/auth/login", "seller/auth/logout"}:
        # Reject unknown seller endpoints instead of leaking a generic public response.
        return j({"error": "Seller API endpoint not found"}, 404)

    return j({"error": "API endpoint not found", "path": "/api/" + path}, 404)
