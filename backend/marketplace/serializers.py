from rest_framework import serializers
from .models import Category, Product, Seller

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]

class PublicSellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seller
        fields = ["id", "business_name", "status"]

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    seller = PublicSellerSerializer(read_only=True)
    class Meta:
        model = Product
        fields = ["id", "sku", "name", "slug", "description", "price_rwf", "compare_at_price_rwf", "stock", "image_url", "is_featured", "display_section", "display_priority", "category", "seller", "created_at"]
