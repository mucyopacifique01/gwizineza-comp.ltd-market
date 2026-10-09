from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True

class Seller(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        SUSPENDED = "SUSPENDED", "Suspended"
    business_name = models.CharField(max_length=180)
    owner_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=32)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    class Meta: ordering = ["business_name"]
    def __str__(self): return self.business_name

class Category(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    def __str__(self): return self.name

class Product(TimeStampedModel):
    sku = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=180, db_index=True)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    price_rwf = models.PositiveIntegerField()
    compare_at_price_rwf = models.PositiveIntegerField(null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    image_url = models.URLField(max_length=1000, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    display_section = models.CharField(max_length=60, blank=True)
    display_priority = models.IntegerField(default=0)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    seller = models.ForeignKey(Seller, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    class Meta: ordering = ["display_priority", "-created_at"]
    def __str__(self): return self.name

class DeliveryZone(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    fee_rwf = models.PositiveIntegerField(default=0)
    eta_min_days = models.PositiveSmallIntegerField(default=1)
    eta_max_days = models.PositiveSmallIntegerField(default=3)
    active = models.BooleanField(default=True)
    def __str__(self): return self.name

class Order(TimeStampedModel):
    class Status(models.TextChoices):
        ORDERED = "ORDERED", "Ordered"
        PROCESSING = "PROCESSING", "Processing"
        SHIPPED = "SHIPPED", "Shipped"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"
    class PaymentMethod(models.TextChoices):
        COD = "COD", "Cash on delivery"
        MOMO = "MOMO", "Mobile Money"
        AIRTEL = "AIRTEL", "Airtel Money"
        CARD = "CARD", "Card"
    order_number = models.CharField(max_length=40, unique=True)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="marketplace_orders")
    customer_name = models.CharField(max_length=160)
    customer_email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32)
    delivery_address = models.CharField(max_length=500)
    delivery_zone = models.ForeignKey(DeliveryZone, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ORDERED, db_index=True)
    payment_method = models.CharField(max_length=10, choices=PaymentMethod.choices, default=PaymentMethod.COD)
    subtotal_rwf = models.PositiveIntegerField()
    delivery_rwf = models.PositiveIntegerField(default=0)
    total_rwf = models.PositiveIntegerField()
    class Meta: ordering = ["-created_at"]
    def __str__(self): return self.order_number

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, null=True, on_delete=models.SET_NULL, related_name="order_items")
    seller = models.ForeignKey(Seller, null=True, blank=True, on_delete=models.SET_NULL, related_name="order_items")
    product_name = models.CharField(max_length=180)
    unit_price_rwf = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    line_total_rwf = models.PositiveIntegerField()

class Payment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"
        CANCELLED = "CANCELLED", "Cancelled"
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=10, choices=Order.PaymentMethod.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    amount_rwf = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default="RWF")
    provider_reference = models.CharField(max_length=180, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

class WishlistItem(models.Model):
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="marketplace_wishlist")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlist_items")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["customer", "product"], name="unique_customer_wishlist_product")]

class ProductReview(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PUBLISHED = "PUBLISHED", "Published"
        HIDDEN = "HIDDEN", "Hidden"
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=160, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)

class SupportTicket(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    subject = models.CharField(max_length=180)
    message = models.TextField()
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN, db_index=True)

class ContentPost(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
    slug = models.SlugField(max_length=200, unique=True)
    title = models.CharField(max_length=220)
    excerpt = models.TextField(blank=True)
    body = models.TextField()
    cover_image = models.URLField(max_length=1000, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    def publish(self):
        self.status = self.Status.PUBLISHED
        self.published_at = timezone.now()
