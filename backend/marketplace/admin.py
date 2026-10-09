from django.contrib import admin
from .models import Category, ContentPost, DeliveryZone, Order, OrderItem, Payment, Product, ProductReview, Seller, SupportTicket, WishlistItem

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "price_rwf", "stock", "is_active", "seller")
    list_filter = ("is_active", "is_featured", "category")
    search_fields = ("name", "sku", "slug")
    prepopulated_fields = {"slug": ("name",)}

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer_name", "status", "total_rwf", "created_at")
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("order_number", "customer_name", "phone")

admin.site.register([Category, ContentPost, DeliveryZone, OrderItem, Payment, ProductReview, Seller, SupportTicket, WishlistItem])
