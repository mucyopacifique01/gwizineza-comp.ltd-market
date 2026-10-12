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

    def test_google_login_endpoint_exists(self):
        # Google sign-in is back: without a token it must fail cleanly, never 410/500.
        response = self.client.post("/api/customer/auth/google",
                                    data="{}",
                                    content_type="application/json",
                                    HTTP_ORIGIN="http://testserver",
                                    HTTP_HOST="testserver")
        self.assertIn(response.status_code, (400, 401, 502, 503))


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


class ProductFilterRegressionTests(TestCase):
    """Slugs and junk in UUID-typed filters must never crash the API (they once returned HTTP 500)."""

    def setUp(self):
        self.client = Client()
        self.category = Category.objects.create(name="Accessories", slug="accessories")
        self.other = Category.objects.create(name="Groceries", slug="groceries")
        Product.objects.create(sku="ACC-1", name="Umbrella", slug="umbrella", price_rwf=2800, stock=5,
                               is_active=True, category=self.category)
        Product.objects.create(sku="GRO-1", name="Rice", slug="rice", price_rwf=12000, stock=5,
                               is_active=True, category=self.other)

    def test_category_filter_by_slug(self):
        response = self.client.get("/api/products?category=accessories")
        self.assertEqual(response.status_code, 200)
        names = [p["name"] for p in response.json()["products"]]
        self.assertEqual(names, ["Umbrella"])

    def test_category_filter_by_uuid_still_works(self):
        response = self.client.get(f"/api/products?category={self.category.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([p["name"] for p in response.json()["products"]], ["Umbrella"])

    def test_unknown_category_returns_empty_list_not_500(self):
        response = self.client.get("/api/products?category=does-not-exist")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["products"], [])

    def test_garbage_seller_and_ids_do_not_crash(self):
        self.assertEqual(self.client.get("/api/products?seller=not-a-uuid").status_code, 200)
        self.assertEqual(self.client.get("/api/products?ids=abc,def").status_code, 200)

    def test_invalid_uuid_lookup_elsewhere_is_a_client_error_not_500(self):
        response = self.client.get("/api/cart?cartId=not-a-uuid")
        self.assertLess(response.status_code, 500)


class GoogleAuthApiTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_auth_config_reports_when_unconfigured(self):
        response = self.client.get("/api/auth/config")
        # Without Supabase env vars the endpoint degrades gracefully.
        self.assertIn(response.status_code, (200, 503))

    def test_google_login_without_token_is_rejected(self):
        response = self.client.post("/api/customer/auth/google",
                                    data="{}",
                                    content_type="application/json",
                                    HTTP_ORIGIN="http://testserver",
                                    HTTP_HOST="testserver")
        self.assertIn(response.status_code, (400, 401, 502, 503))
        self.assertNotIn(b"HTML", response.content)

    def test_google_login_survives_malformed_body(self):
        response = self.client.post("/api/customer/auth/google",
                                    data="{bad json",
                                    content_type="application/json",
                                    HTTP_ORIGIN="http://testserver",
                                    HTTP_HOST="testserver")
        self.assertIn(response.status_code, (400, 401, 502, 503))


class GoogleLoginSuccessTests(TestCase):
    """Regression: Supabase /auth/v1/user returns the user at the top level (no 'user' wrapper)."""

    def _login(self, payload):
        from unittest import mock
        from django.test import override_settings

        class FakeResponse:
            status_code = 200

            def json(self_inner):
                return payload

        with override_settings(SUPABASE_URL="https://example.supabase.co", SUPABASE_ANON_KEY="anon"):
            with mock.patch("market.views.requests.get", return_value=FakeResponse()):
                return self.client.post(
                    "/api/customer/auth/google",
                    data='{"accessToken": "tok"}',
                    content_type="application/json",
                    HTTP_ORIGIN="http://testserver",
                    HTTP_HOST="testserver",
                )

    def test_top_level_user_object_signs_in(self):
        response = self._login({
            "id": "11111111-1111-1111-1111-111111111111",
            "email": "Buyer@Example.com",
            "user_metadata": {"full_name": "Test Buyer"},
        })
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["customer"]["email"], "buyer@example.com")

    def test_wrapped_user_object_still_signs_in(self):
        response = self._login({"user": {"id": "22222222-2222-2222-2222-222222222222", "email": "wrapped@example.com"}})
        self.assertEqual(response.status_code, 200, response.content)

    def test_missing_id_is_rejected(self):
        response = self._login({"email": "x@example.com"})
        self.assertEqual(response.status_code, 502)
