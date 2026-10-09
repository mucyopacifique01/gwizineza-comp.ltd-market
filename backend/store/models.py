import uuid
from django.db import models


class Timestamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)

    def __str__(self):
        return self.name


class Seller(Timestamped):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        SUSPENDED = "SUSPENDED", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_name = models.CharField(max_length=180)
    owner_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=32)
    email = models.EmailField(blank=True, null=True)
    address = models.CharField(max_length=300, blank=True, null=True)
    login_username = models.CharField(max_length=80, unique=True)
    password_hash = models.CharField(max_length=256)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)

    def __str__(self):
        return self.business_name


class CustomerProfile(Timestamped):
    # This id is the UUID supplied by Supabase Auth; the identity/password is
    # never duplicated in the application database.
    id = models.UUIDField(primary_key=True, editable=False)
    name = models.CharField(max_length=160, blank=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=32, blank=True, null=True)
    avatar_url = models.URLField(max_length=600, blank=True, null=True)


class Product(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sku = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=220)
    slug = models.SlugField(max_length=240, unique=True)
    description = models.TextField(blank=True, null=True)
    price_rwf = models.PositiveIntegerField()
    compare_at_price_rwf = models.PositiveIntegerField(blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)
    image_url = models.URLField(max_length=700, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    display_section = models.CharField(max_length=40, blank=True, null=True)
    display_priority = models.IntegerField(default=0)
    category = models.ForeignKey(Category, blank=True, null=True, on_delete=models.SET_NULL, related_name="products")
    seller = models.ForeignKey(Seller, blank=True, null=True, on_delete=models.SET_NULL, related_name="products")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_active", "created_at"]),
            models.Index(fields=["seller", "is_active"]),
        ]

    def __str__(self):
        return self.name


class ProductImage(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    url = models.URLField(max_length=700)
    alt_text = models.CharField(max_length=240, blank=True, null=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_primary", "sort_order", "created_at"]


class Cart(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)


class CartItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["cart", "product"], name="unique_cart_product")]


class Order(Timestamped):
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
    phone = models.CharField(max_length=32)
    customer_email = models.EmailField(blank=True, null=True)
    customer_user_id = models.UUIDField(blank=True, null=True, db_index=True)
    delivery_address = models.CharField(max_length=500)
    subtotal_rwf = models.PositiveIntegerField()
    delivery_rwf = models.PositiveIntegerField(default=0)
    total_rwf = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default="RWF")

    class Meta:
        ordering = ["-created_at"]


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    seller = models.ForeignKey(Seller, blank=True, null=True, on_delete=models.SET_NULL, related_name="order_items")
    product_name = models.CharField(max_length=220)
    unit_price_rwf = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField()
    line_total_rwf = models.PositiveIntegerField()


class Payment(Timestamped):
    class Method(models.TextChoices):
        COD = "COD", "Cash on delivery"
        MOMO = "MOMO", "Mobile Money"
        AIRTEL = "AIRTEL", "Airtel Money"
        CARD = "CARD", "Card"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=12, choices=Method.choices, default=Method.COD)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    amount_rwf = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default="RWF")
    provider = models.CharField(max_length=80, blank=True, null=True)
    provider_ref = models.CharField(max_length=200, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)


class WishlistItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer_id = models.UUIDField(db_index=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlist_items")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["customer_id", "product"], name="unique_customer_wishlist_product")]


class ProductReview(Timestamped):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PUBLISHED = "PUBLISHED", "Published"
        HIDDEN = "HIDDEN", "Hidden"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    customer_id = models.UUIDField(blank=True, null=True, db_index=True)
    order = models.ForeignKey(Order, blank=True, null=True, on_delete=models.SET_NULL, related_name="reviews")
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
    customer_id = models.UUIDField(blank=True, null=True, db_index=True)
    seller = models.ForeignKey(Seller, blank=True, null=True, on_delete=models.SET_NULL, related_name="tickets")
    subject = models.CharField(max_length=180)
    message = models.TextField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=12, choices=Priority.choices, default=Priority.NORMAL)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=32, blank=True, null=True)


class ContentPost(Timestamped):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=220, unique=True)
    title = models.CharField(max_length=220)
    excerpt = models.TextField(blank=True, null=True)
    body = models.TextField()
    cover_image = models.URLField(max_length=700, blank=True, null=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(blank=True, null=True)


class DeliveryZone(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=160, unique=True)
    fee_rwf = models.PositiveIntegerField(default=0)
    eta_min_days = models.PositiveSmallIntegerField(default=1)
    eta_max_days = models.PositiveSmallIntegerField(default=3)
    active = models.BooleanField(default=True)


class SiteSettings(Timestamped):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=60, unique=True, default="primary")
    site_name = models.CharField(max_length=160, default="Gwizineza Market")
    tagline = models.CharField(max_length=240, default="Your trusted Rwandan marketplace")
    location = models.CharField(max_length=160, default="Kabarondo")
    region = models.CharField(max_length=160, default="Rwanda")
    phone = models.CharField(max_length=32, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    whatsapp = models.CharField(max_length=32, blank=True, null=True)
    copyright_text = models.CharField(max_length=240, default="Gwizineza Market")
    copyright_year = models.PositiveSmallIntegerField(default=2026)
    footer_credit = models.CharField(max_length=240, default="Made in Rwanda")
    announcement_text = models.CharField(max_length=300, blank=True, null=True)
    announcement_enabled = models.BooleanField(default=True)
    map_lat = models.FloatField(blank=True, null=True)
    map_lng = models.FloatField(blank=True, null=True)


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor_type = models.CharField(max_length=30)
    actor_id = models.CharField(max_length=80, blank=True, null=True)
    action = models.CharField(max_length=120)
    entity_type = models.CharField(max_length=80)
    entity_id = models.CharField(max_length=80, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
