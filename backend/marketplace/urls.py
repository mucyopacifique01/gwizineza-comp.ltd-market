from django.urls import path
from .views import CategoryListView, ProductListView

urlpatterns = [path("products/", ProductListView.as_view(), name="products"), path("categories/", CategoryListView.as_view(), name="categories")]
