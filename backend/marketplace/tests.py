from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from marketplace.models import Category, Product, Seller

User = get_user_model()


class MarketplaceApiSmokeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="seller-one",
            email="seller@example.test",
            password="test-password-123",
        )
        self.seller = Seller.objects.create(
            owner=self.owner,
            business_name="Kabarondo Essentials",
            slug="kabarondo-essentials",
            status=Seller.Status.APPROVED,
        )
        self.category = Category.objects.create(name="Household", slug="household")
        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name="Soap Box",
            slug="soap-box",
            price_rwf=1500,
            stock_quantity=12,
            is_active=True,
        )

    def test_health_endpoint_checks_database(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")

    def test_public_product_catalog_only_exposes_approved_sellers(self):
        response = self.client.get("/api/v1/products/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["slug"], "soap-box")

    def test_public_category_list(self):
        response = self.client.get("/api/v1/categories/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["slug"], "household")

    def test_private_cart_rejects_anonymous_write(self):
        response = self.client.post(
            "/api/v1/cart/",
            {"product_id": self.product.id, "quantity": 1},
            format="json",
        )
        self.assertIn(response.status_code, (401, 403))

    def test_suspended_seller_products_are_not_public(self):
        self.seller.status = Seller.Status.SUSPENDED
        self.seller.save(update_fields=["status", "updated_at"])
        response = self.client.get("/api/v1/products/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
