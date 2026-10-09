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


    def test_product_detail_by_slug_works_with_uuid_primary_keys(self):
        product = Product.objects.create(
            sku="SLUG-1",
            name="Slug Lookup Rice",
            slug="slug-lookup-rice",
            price_rwf=1800,
            stock=3,
            is_active=True,
        )
        response = self.client.get("/api/products/slug-lookup-rice")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["product"]["id"], str(product.id))

    def test_phone_normalization_converts_rwanda_local_number(self):
        from .views import normalize_contact
        self.assertEqual(normalize_contact("078 123 4567"), ("phone", "+250781234567"))
