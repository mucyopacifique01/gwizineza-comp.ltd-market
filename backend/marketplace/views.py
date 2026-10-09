from django.db import connection
from django.db.utils import DatabaseError
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework import status, generics, filters
from rest_framework.throttling import AnonRateThrottle
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer

@api_view(["GET"])
@throttle_classes([])
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return Response({"status": "ok", "database": "connected"})
    except DatabaseError:
        return Response({"status": "degraded", "database": "unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "sku", "category__name", "seller__business_name"]
    ordering_fields = ["price_rwf", "created_at", "name", "display_priority"]
    ordering = ["display_priority", "-created_at"]
    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True, seller__status__in=["APPROVED"]).select_related("category", "seller")
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category)
        if self.request.query_params.get("featured", "").lower() in ("1", "true", "yes"):
            queryset = queryset.filter(is_featured=True)
        min_price = self.request.query_params.get("minPrice")
        max_price = self.request.query_params.get("maxPrice")
        if min_price and min_price.isdigit(): queryset = queryset.filter(price_rwf__gte=int(min_price))
        if max_price and max_price.isdigit(): queryset = queryset.filter(price_rwf__lte=int(max_price))
        return queryset

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
