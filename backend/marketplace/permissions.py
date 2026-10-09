from rest_framework.permissions import SAFE_METHODS, BasePermission

from marketplace.models import Seller


class ProductPermissions(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_staff or request.user.is_superuser:
            return True
        try:
            return obj.seller.owner_id == request.user.id and obj.seller.status == Seller.Status.APPROVED
        except (AttributeError, Seller.DoesNotExist):
            return False
