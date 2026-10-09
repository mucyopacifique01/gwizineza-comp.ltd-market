import uuid

from django.db import models


class Timestamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Seller(Timestamped):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        SUSPENDED = "SUSPENDED", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_name = models.CharField(max_length=160)
    owner_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=30)
    email = models.EmailField(blank=True, null=True)
    address = models.CharField(max_length=300, blank=True, null=True)
    login_username = models.CharField(max_length=80, unique=True, blank=True, null=True)
    password_hash = models.CharField(max_length=256, blank=True, default="")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.APPROVED)

    class Meta:
        ordering = ["business_name"]

    def __str__(self):
        return self.business_name


class Category(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sku = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)
    price_rwf = models.PositiveIntegerField()
    compare_at_price_rwf = models.PositiveIntegerField(blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)
    image_url = models.URLField(max_length=1000, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    display_section = models.CharField(max_length=80, blank=True, null=True)
    display_priority = models.IntegerField(blank=True, null=True)
    category = models.ForeignKey(Category, related_name="products", blank=True, null=True, on_delete=models.SET_NULL)
    seller = models.ForeignKey(Seller, related_name="products", blank=True, null=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_active", "created_at"]),
            models.Index(fields=["seller", "is_active"]),
            models.Index(fields=["category", "is_active"]),
        ]

    def __str__(self):
        return self.name


class ProductImage(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, related_name="images", on_delete=models.CASCADE)
    url = models.URLField(max_length=1000)
    alt_text = models.CharField(max_length=240, blank=True, null=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_primary", "sort_order", "created_at"]


class Cart(Timestamped):
    # Keep the 24-character browser cart ID format so existing storefront carts work.
    id = models.CharField(primary_key=True, max_length=64)

    
class CartItem(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name="cart_items", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["cart", "product"], name="uniq_cart_product")]


class CustomerProfile(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supabase_user_id = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=160, blank=True, default="")
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    avatar_url = models.URLField(max_length=1000, blank=True, null=True)

    class Meta:
        indexes = [models.Index(fields=["email"]), models.Index(fields=["phone"])]


class StoreOrder(Timestamped):
    class Status(models.TextChoices):
        ORDERED = "ORDERED", "Ordered"
        PROCESSING = "PROCESSING", "Processing"
        SHIPPED = "SHIPPED", "Shipped"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=48, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ORDERED)
    customer_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=30)
    customer_email = models.EmailField(blank=True, null=True)
    customer = models.ForeignKey(CustomerProfile, related_name="orders", blank=True, null=True, on_delete=models.SET_NULL)
    delivery_address = models.CharField(max_length=700)
    subtotal_rwf = models.PositiveIntegerField()
    delivery_rwf = models.PositiveIntegerField(default=0)
    total_rwf = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default="RWF")

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["phone"]), models.Index(fields=["status"])]


class StoreOrderItem(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(StoreOrder, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name="order_items", on_delete=models.PROTECT)
    seller = models.ForeignKey(Seller, related_name="order_items", blank=True, null=True, on_delete=models.SET_NULL)
    product_name = models.CharField(max_length=180)
    unit_price_rwf = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField()
    line_total_rwf = models.PositiveIntegerField()


class PaymentRecord(Timestamped):
    class Method(models.TextChoices):
        COD = "COD", "Cash on delivery"
        MOMO = "MOMO", "MTN Mobile Money"
        AIRTEL = "AIRTEL", "Airtel Money"
        CARD = "CARD", "Card"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(StoreOrder, related_name="payment", on_delete=models.CASCADE)
    method = models.CharField(max_length=12, choices=Method.choices, default=Method.COD)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    amount_rwf = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default="RWF")
    provider = models.CharField(max_length=80, blank=True, null=True)
    provider_ref = models.CharField(max_length=180, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)


class SiteSettings(Timestamped):
    key = models.CharField(max_length=40, primary_key=True, default="site")
    site_name = models.CharField(max_length=120, default="Gwizineza Market")
    tagline = models.CharField(max_length=240, default="Everyday goods from trusted local sellers, connected in one market.")
    location = models.CharField(max_length=180, default="Kabarondo, Rwanda")
    region = models.CharField(max_length=240, default="Kabarondo · Kayonza District · Eastern Province")
    phone = models.CharField(max_length=40, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    whatsapp = models.CharField(max_length=40, blank=True, default="")
    copyright_text = models.CharField(max_length=160, default="Gwizineza Market")
    copyright_year = models.PositiveIntegerField(default=2026)
    footer_credit = models.CharField(max_length=160, default="Created by Mucyo Pacifique")
    announcement_text = models.CharField(max_length=240, blank=True, default="")
    announcement_enabled = models.BooleanField(default=True)
    map_lat = models.FloatField(blank=True, null=True, default=-2.0127)
    map_lng = models.FloatField(blank=True, null=True, default=30.5585)


class WishlistItem(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(CustomerProfile, related_name="wishlist_items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name="wishlist_items", on_delete=models.CASCADE)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["customer", "product"], name="uniq_customer_wishlist_product")]


class ProductReview(Timestamped):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PUBLISHED = "PUBLISHED", "Published"
        HIDDEN = "HIDDEN", "Hidden"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, related_name="reviews", on_delete=models.CASCADE)
    customer = models.ForeignKey(CustomerProfile, related_name="reviews", blank=True, null=True, on_delete=models.SET_NULL)
    order = models.ForeignKey(StoreOrder, related_name="reviews", blank=True, null=True, on_delete=models.SET_NULL)
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=180, blank=True, null=True)
    body = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    verified = models.BooleanField(default=False)


class SupportTicket(Timestamped):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(CustomerProfile, related_name="tickets", blank=True, null=True, on_delete=models.SET_NULL)
    seller = models.ForeignKey(Seller, related_name="tickets", blank=True, null=True, on_delete=models.SET_NULL)
    subject = models.CharField(max_length=180)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=12, choices=Priority.choices, default=Priority.NORMAL)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)


class ContentPost(Timestamped):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=200, unique=True)
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=500, blank=True, null=True)
    body = models.TextField(blank=True, default="")
    cover_image = models.URLField(max_length=1000, blank=True, null=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(blank=True, null=True)


class DeliveryZone(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    fee_rwf = models.PositiveIntegerField(default=0)
    eta_min_days = models.PositiveSmallIntegerField(default=1)
    eta_max_days = models.PositiveSmallIntegerField(default=3)
    active = models.BooleanField(default=True)


class AuditLog(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor_type = models.CharField(max_length=30)
    actor_id = models.CharField(max_length=80, blank=True, null=True)
    action = models.CharField(max_length=120)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
