from django.test import TestCase
from rest_framework.test import APIClient
from .models import Category, Product, Seller

class PublicApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = Category.objects.create(name="Household", slug="household")
        self.approved = Seller.objects.create(business_name="Approved shop", owner_name="Owner", phone="250780000001", status=Seller.Status.APPROVED)
        self.pending = Seller.objects.create(business_name="Pending shop", owner_name="Owner", phone="250780000002", status=Seller.Status.PENDING)
        Product.objects.create(sku="APP-1", name="Soap", slug="soap", price_rwf=1000, stock=4, category=self.category, seller=self.approved, is_active=True)
        Product.objects.create(sku="PEN-1", name="Hidden soap", slug="hidden-soap", price_rwf=800, stock=4, seller=self.pending, is_active=True)
        Product.objects.create(sku="OFF-1", name="Disabled", slug="disabled", price_rwf=500, stock=4, seller=self.approved, is_active=False)
    def test_products_only_expose_active_products_from_approved_sellers(self):
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)
        names = [item["name"] for item in response.data["results"]]
        self.assertEqual(names, ["Soap"])
    def test_search_and_price_filters(self):
        response = self.client.get("/api/products/?search=soap&maxPrice=1200")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
    def test_health_checks_database(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["database"], "connected")
