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


class AuthFlowTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_normalize_contact_accepts_email_and_international_phone(self):
        from .views import normalize_contact
        self.assertEqual(normalize_contact("Pacifique@Example.COM"), ("email", "pacifique@example.com"))
        self.assertEqual(normalize_contact("+250 788 123 456"), ("phone", "+250788123456"))
        self.assertEqual(normalize_contact("not-a-contact"), (None, None))

    def test_otp_send_reports_missing_supabase_configuration(self):
        with self.settings(SUPABASE_URL="", SUPABASE_ANON_KEY=""):
            response = self.client.post("/api/customer/auth/otp/send",
                                        data='{"contact":"+250788123456"}', content_type="application/json")
            self.assertEqual(response.status_code, 503)
            self.assertIn("not configured", response.json()["error"])

    def test_otp_verify_rejects_malformed_codes(self):
        with self.settings(SUPABASE_URL="", SUPABASE_ANON_KEY=""):
            response = self.client.post("/api/customer/auth/otp/verify",
                                        data='{"contact":"+250788123456","code":"12"}', content_type="application/json")
            self.assertEqual(response.status_code, 400)

    def test_google_login_is_retired_with_gone(self):
        response = self.client.post("/api/customer/auth/google")
        self.assertEqual(response.status_code, 410)


class AdminAndCartTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.category = Category.objects.create(name="Hardware", slug="hardware")
        self.product = Product.objects.create(
            sku="HAM-1", name="Hammer", slug="hammer", price_rwf=5000, stock=10,
            category=self.category, is_active=True,
        )

    def test_admin_login_and_session(self):
        with self.settings(ADMIN_PASSWORD=""):
            response = self.client.post("/api/admin/login",
                                        data='{"password":"owner-secret"}', content_type="application/json")
            self.assertEqual(response.status_code, 503)
        with self.settings(ADMIN_PASSWORD="owner-secret"):
            response = self.client.post("/api/admin/login",
                                        data='{"password":"wrong"}', content_type="application/json")
            self.assertEqual(response.status_code, 401)
            response = self.client.post("/api/admin/login",
                                        data='{"password":"owner-secret"}', content_type="application/json")
            self.assertEqual(response.status_code, 200)
            self.assertIn("gwizineza_admin_session", response.cookies)
            orders = self.client.get("/api/admin/orders")
            self.assertEqual(orders.status_code, 200)

    def test_cart_add_then_checkout_creates_order(self):
        response = self.client.post("/api/cart",
                                    data='{"cartId":"t1","productId":"%s","quantity":2}' % self.product.id,
                                    content_type="application/json")
        self.assertEqual(response.status_code, 201)
        response = self.client.post("/api/checkout",
                                    data='{"cartId":"t1","customerName":"Test Buyer","phone":"0788123456","deliveryAddress":"Kigali","paymentMethod":"COD"}',
                                    content_type="application/json")
        self.assertEqual(response.status_code, 201)
        payload = response.json()["order"]
        self.assertEqual(payload["customerName"], "Test Buyer")
        self.assertEqual(payload["subtotalRwf"], 10000)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

    def test_cart_rejects_missing_fields(self):
        response = self.client.post("/api/cart", data='{"cartId":"t1"}', content_type="application/json")
        self.assertEqual(response.status_code, 400)
