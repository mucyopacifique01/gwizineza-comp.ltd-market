from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from marketplace.models import CartItem, Category, DeliveryZone, Order, Product, Seller

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


    def test_checkout_uses_server_totals_and_deducts_stock_atomically(self):
        self.client.force_authenticate(user=self.owner)
        CartItem.objects.create(user=self.owner, product=self.product, quantity=1)
        zone = DeliveryZone.objects.create(name="Kabarondo zone", fee_rwf=500, estimated_days=1)

        response = self.client.post(
            "/api/v1/checkout/",
            {
                "customer_name": "Test Customer",
                "customer_phone": "0780000000",
                "delivery_address": "Kabarondo, Rwanda",
                "delivery_zone_id": zone.id,
                "payment_method": "cod",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(int(response.data["subtotal_rwf"]), 1500)
        self.assertEqual(int(response.data["delivery_fee_rwf"]), 500)
        self.assertEqual(int(response.data["total_rwf"]), 2000)
        self.assertEqual(response.data["payment"]["status"], "pending")
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 11)
        self.assertFalse(CartItem.objects.filter(user=self.owner).exists())
        self.assertEqual(Order.objects.count(), 1)

    def test_online_payment_is_rejected_until_a_provider_is_configured(self):
        self.client.force_authenticate(user=self.owner)
        CartItem.objects.create(user=self.owner, product=self.product, quantity=1)

        response = self.client.post(
            "/api/v1/checkout/",
            {
                "customer_name": "Test Customer",
                "customer_phone": "0780000000",
                "delivery_address": "Kabarondo, Rwanda",
                "payment_method": "momo",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.assertTrue(CartItem.objects.filter(user=self.owner).exists())
