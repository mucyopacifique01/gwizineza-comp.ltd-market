from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from marketplace.views import (
    AdminDashboardView,
    CartItemViewSet,
    CheckoutView,
    ContentPostViewSet,
    CurrentUserView,
    DeliveryZoneViewSet,
    HealthView,
    OrderViewSet,
    PaymentViewSet,
    ProductReviewViewSet,
    ProductViewSet,
    PublicCategoryViewSet,
    PublicSellerViewSet,
    SellerDashboardView,
    SupportTicketViewSet,
    WishlistItemViewSet,
)

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("categories", PublicCategoryViewSet, basename="category")
router.register("sellers", PublicSellerViewSet, basename="seller")
router.register("cart", CartItemViewSet, basename="cart")
router.register("wishlist", WishlistItemViewSet, basename="wishlist")
router.register("orders", OrderViewSet, basename="order")
router.register("reviews", ProductReviewViewSet, basename="review")
router.register("support/tickets", SupportTicketViewSet, basename="support-ticket")
router.register("delivery-zones", DeliveryZoneViewSet, basename="delivery-zone")
router.register("payments", PaymentViewSet, basename="payment")
router.register("content", ContentPostViewSet, basename="content")

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/health/", HealthView.as_view(), name="api-health"),
    path("api/v1/", include(router.urls)),
    path("api/v1/checkout/", CheckoutView.as_view(), name="checkout"),
    path("api/v1/me/", CurrentUserView.as_view(), name="current-user"),
    path("api/v1/seller/dashboard/", SellerDashboardView.as_view(), name="seller-dashboard"),
    path("api/v1/admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
]
