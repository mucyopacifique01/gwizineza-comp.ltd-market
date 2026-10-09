from django.contrib import admin

from marketplace.models import (
    AuditLog,
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


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "phone", "supabase_uid", "created_at")
    list_filter = ("role",)
    search_fields = ("user__email", "user__username", "phone", "supabase_uid")
    readonly_fields = ("supabase_uid", "created_at", "updated_at")


@admin.register(Seller)
class SellerAdmin(admin.ModelAdmin):
    list_display = ("business_name", "owner", "status", "city", "created_at")
    list_filter = ("status", "city")
    search_fields = ("business_name", "owner__email", "phone", "slug")
    prepopulated_fields = {"slug": ("business_name",)}


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "sort_order")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "seller", "category", "price_rwf", "stock_quantity", "is_active", "is_featured")
    list_filter = ("is_active", "is_featured", "category", "seller")
    search_fields = ("name", "slug", "sku", "seller__business_name")
    prepopulated_fields = {"slug": ("name",)}


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_name", "unit_price_rwf", "quantity", "line_total_rwf")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer_name", "status", "payment_status", "total_rwf", "created_at")
    list_filter = ("status", "payment_status", "payment_method", "created_at")
    search_fields = ("order_number", "customer_name", "customer_email", "customer_phone")
    readonly_fields = ("order_number", "subtotal_rwf", "delivery_fee_rwf", "total_rwf", "created_at", "updated_at")
    inlines = [OrderItemInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "method", "status", "amount_rwf", "provider_reference", "updated_at")
    list_filter = ("method", "status")
    search_fields = ("order__order_number", "provider_reference")
    readonly_fields = ("created_at", "updated_at")


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ("name", "fee_rwf", "estimated_days", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "areas")


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "customer", "rating", "status", "created_at")
    list_filter = ("status", "rating")
    search_fields = ("product__name", "customer__email", "title", "body")


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ("subject", "customer", "status", "priority", "created_at")
    list_filter = ("status", "priority", "created_at")
    search_fields = ("subject", "customer__email", "message")
    readonly_fields = ("customer", "message", "created_at", "updated_at")


@admin.register(ContentPost)
class ContentPostAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "status", "published_at", "updated_at")
    list_filter = ("status",)
    search_fields = ("title", "slug", "excerpt")
    prepopulated_fields = {"slug": ("title",)}


admin.site.register([CartItem, WishlistItem, OrderItem, AuditLog])
