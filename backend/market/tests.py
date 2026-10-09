from django.test import TestCase, Client
from django.urls import reverse
from .models import Category, Product


class MarketApiTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_health_reports_django_and_supabase_postgres(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["backend"], "Django")
        self.assertEqual(response.json()["database"], "Supabase PostgreSQL")

    def test_products_are_public_and_serialized_in_frontend_case(self):
        category = Category.objects.create(name="Groceries", slug="groceries")
        Product.objects.create(
            sku="TEST-1",
            name="Test Rice",
            slug="test-rice",
            price_rwf=2500,
            stock=4,
            category=category,
            is_active=True,
        )
        response = self.client.get("/api/products")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["products"]), 1)
        self.assertEqual(payload["products"][0]["priceRwf"], 2500)
        self.assertEqual(payload["products"][0]["category"]["slug"], "groceries")

    def test_admin_routes_require_login(self):
        response = self.client.get("/api/admin/orders")
        self.assertEqual(response.status_code, 401)

    def test_health_does_not_expose_configuration(self):
        response = self.client.get("/api/health")
        body = response.content.decode().lower()
        self.assertNotIn("service_role", body)
        self.assertNotIn("database_url", body)
