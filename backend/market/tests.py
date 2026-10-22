from django.test import TestCase, Client
from django.urls import reverse
from django.core import signing
from .models import (AuditLog, Cart, Category, CustomerProfile, NewsletterSubscriber, PaymentRecord, Product, Seller, StoreOrder, StoreOrderItem)


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
        self.assertTrue(payload["orderNumber"].startswith("GW-"))
        order = StoreOrder.objects.get(order_number=payload["orderNumber"])
        self.assertEqual(order.items.count(), 1)
        item = order.items.get()
        self.assertEqual(item.product_id, self.product.id)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.line_total_rwf, 10000)
        self.assertEqual(order.payment.status, PaymentRecord.Status.PENDING)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

    def test_cart_rejects_missing_fields(self):
        response = self.client.post("/api/cart", data='{"cartId":"t1"}', content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_cart_rejects_quantity_above_stock_without_mutating_cart(self):
        response = self.client.post(
            "/api/cart",
            data='{"cartId":"stock-check","productId":"%s","quantity":11}' % self.product.id,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertFalse(Cart.objects.filter(id="stock-check").exists())

    def test_checkout_rejects_empty_cart_without_creating_order(self):
        response = self.client.post(
            "/api/checkout",
            data='{"cartId":"empty-checkout","customerName":"Test Buyer","phone":"0788123456","deliveryAddress":"Kabarondo"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["error"].lower())
        self.assertFalse(StoreOrder.objects.filter(customer_name="Test Buyer").exists())

    def test_checkout_rejects_invalid_phone_without_creating_order(self):
        response = self.client.post(
            "/api/checkout",
            data='{"cartId":"invalid-phone","customerName":"Test Buyer","phone":"abc","deliveryAddress":"Kabarondo"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(StoreOrder.objects.filter(customer_name="Test Buyer").exists())

    def test_customer_wishlist_requires_authenticated_customer(self):
        response = self.client.get("/api/wishlist")
        self.assertEqual(response.status_code, 401)


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


class HeroSliderAndLogoTests(TestCase):
    """Owner-editable homepage slider and brand logo."""

    def setUp(self):
        self.client = Client()
        self.H = {"HTTP_HOST": "testserver", "HTTP_ORIGIN": "http://testserver"}

    def _admin(self):
        with self.settings(ADMIN_PASSWORD="owner-secret"):
            r = self.client.post("/api/admin/login", data='{"password":"owner-secret"}',
                                 content_type="application/json", **self.H)
        self.assertEqual(r.status_code, 200)

    def _send(self, method, url, data=None):
        import json as _json
        if method == "get":
            return self.client.get(url, **self.H)
        return getattr(self.client, method)(url, data=_json.dumps(data if data is not None else {}),
                                            content_type="application/json", **self.H)

    # ---- public ----
    def test_public_slides_are_seeded_with_the_ten_brand_images(self):
        r = self.client.get("/api/site/slides")
        self.assertEqual(r.status_code, 200)
        slides = r.json()["slides"]
        self.assertEqual(len(slides), 10)
        self.assertTrue(all(s["imageUrl"].startswith("/brand/slides/") for s in slides))
        self.assertEqual([s["sortOrder"] for s in slides], list(range(10)))

    def test_seeding_happens_only_once(self):
        self._admin()
        self.client.get("/api/site/slides")
        for s in self._send("get", "/api/admin/slides").json()["slides"]:
            self._send("delete", "/api/admin/slides/" + s["id"])
        self.assertEqual(self.client.get("/api/site/slides").json()["slides"], [])  # stays empty after owner deletes all

    def test_public_slides_hide_inactive(self):
        self._admin()
        first = self._send("get", "/api/admin/slides").json()["slides"][0]
        self._send("patch", "/api/admin/slides/" + first["id"], {"isActive": False})
        ids = [s["id"] for s in self.client.get("/api/site/slides").json()["slides"]]
        self.assertNotIn(first["id"], ids)
        self.assertEqual(len(ids), 9)

    # ---- admin auth ----
    def test_admin_endpoints_require_login(self):
        for method, url in [("get", "/api/admin/slides"), ("post", "/api/admin/slides"), ("put", "/api/admin/slides"),
                            ("patch", "/api/admin/slides/00000000-0000-0000-0000-000000000000"),
                            ("delete", "/api/admin/slides/00000000-0000-0000-0000-000000000000"),
                            ("get", "/api/admin/logo"), ("patch", "/api/admin/logo")]:
            self.assertEqual(self._send(method, url).status_code, 401, method + " " + url)

    # ---- admin CRUD ----
    def test_create_edit_delete_slide(self):
        self._admin()
        r = self._send("post", "/api/admin/slides", {"imageUrl": "https://x.supabase.co/a.jpg", "title": "Hello",
                                                     "linkUrl": "/shop", "linkLabel": "Go"})
        self.assertEqual(r.status_code, 201, r.content)
        sid = r.json()["slide"]["id"]
        self.assertEqual(r.json()["slide"]["sortOrder"], 10)           # appended after the 10 seeded slides
        r = self._send("patch", "/api/admin/slides/" + sid, {"title": "Renamed", "subtitle": "Sub", "isActive": False})
        self.assertEqual(r.json()["slide"]["title"], "Renamed")
        self.assertFalse(r.json()["slide"]["isActive"])
        self.assertEqual(self._send("delete", "/api/admin/slides/" + sid).status_code, 200)
        self.assertEqual(self._send("delete", "/api/admin/slides/" + sid).status_code, 404)

    def test_reorder_slides(self):
        self._admin()
        ids = [s["id"] for s in self._send("get", "/api/admin/slides").json()["slides"]]
        reversed_ids = list(reversed(ids))
        r = self._send("put", "/api/admin/slides", {"order": reversed_ids})
        self.assertEqual([s["id"] for s in r.json()["slides"]], reversed_ids)
        self.assertEqual([s["id"] for s in self.client.get("/api/site/slides").json()["slides"]], reversed_ids)

    def test_validation_rejects_unsafe_input(self):
        self._admin()
        bad = [
            {"imageUrl": ""},
            {"imageUrl": "javascript:alert(1)"},
            {"imageUrl": "http://insecure.example/a.jpg"},      # http images blocked (mixed content)
            {"imageUrl": "//evil.example/a.jpg"},
            {"imageUrl": "https://ok.example/a.jpg", "linkUrl": "javascript:alert(1)"},
            {"imageUrl": "https://ok.example/a.jpg", "linkUrl": "//evil.example"},
        ]
        for payload in bad:
            self.assertEqual(self._send("post", "/api/admin/slides", payload).status_code, 400, payload)

    def test_slide_limit(self):
        self._admin()
        for i in range(20):
            self.assertEqual(self._send("post", "/api/admin/slides", {"imageUrl": "https://ok.example/%d.jpg" % i}).status_code, 201)
        self.assertEqual(self._send("post", "/api/admin/slides", {"imageUrl": "https://ok.example/over.jpg"}).status_code, 409)

    def test_unknown_or_garbage_slide_id_is_404_not_500(self):
        self._admin()
        for bad_id in ("not-a-uuid", "00000000-0000-0000-0000-000000000000"):
            self.assertEqual(self._send("patch", "/api/admin/slides/" + bad_id, {"title": "x"}).status_code, 404)

    # ---- logo ----
    def test_logo_defaults_override_and_reset(self):
        defaults = self.client.get("/api/site/logo").json()["logo"]
        self.assertEqual(defaults["logo"], "/brand/logo-mark-on-dark.png")
        self._admin()
        r = self._send("patch", "/api/admin/logo", {"logo": "https://x.supabase.co/new-logo.png"})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.client.get("/api/site/logo").json()["logo"]["logo"], "https://x.supabase.co/new-logo.png")
        self.assertEqual(self.client.get("/api/site/logo").json()["logo"]["logo_light"], "/brand/logo-mark-on-light.png")
        self._send("patch", "/api/admin/logo", {"logo": ""})       # empty value resets to the built-in logo
        self.assertEqual(self.client.get("/api/site/logo").json()["logo"]["logo"], "/brand/logo-mark-on-dark.png")

    def test_logo_rejects_bad_url(self):
        self._admin()
        self.assertEqual(self._send("patch", "/api/admin/logo", {"logo": "javascript:alert(1)"}).status_code, 400)


class MapPlaceTests(TestCase):
    """SerpApi-backed Google Map info card: graceful without a key, admin-managed key."""

    def setUp(self):
        self.client = Client()
        from django.core.cache import cache
        cache.delete("map_place_v1")

    def test_map_place_returns_200_with_fallback_when_no_key(self):
        with self.settings(SERPAPI_KEY=""):
            from .models import SiteAsset
            SiteAsset.objects.filter(key="serpapi_key").delete()
            response = self.client.get("/api/map/place")
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertIsNone(payload["place"])
            self.assertEqual(payload["source"], "fallback")
            self.assertIn("name", payload["fallback"])
            self.assertIn("address", payload["fallback"])

    def test_admin_settings_manage_serpapi_key_without_leaking_it(self):
        from .models import SiteAsset
        with self.settings(ADMIN_PASSWORD="owner-secret", SERPAPI_KEY=""):
            self.client.post("/api/admin/login",
                             data='{"password":"owner-secret"}', content_type="application/json")
            response = self.client.get("/api/admin/settings")
            self.assertEqual(response.status_code, 200)
            self.assertFalse(response.json()["settings"]["hasSerpApiKey"])

            response = self.client.patch("/api/admin/settings",
                                         data='{"serpApiKey":"serp-test-key-123"}', content_type="application/json")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["hasSerpApiKey"])
            self.assertEqual(SiteAsset.objects.get(key="serpapi_key").url, "serp-test-key-123")

            # The public settings payload must never expose the key, only the boolean exists in admin GET.
            public = self.client.get("/api/site/settings")
            self.assertNotIn("serp", public.content.decode().lower())

            response = self.client.patch("/api/admin/settings",
                                         data='{"serpApiKey":""}', content_type="application/json")
            self.assertEqual(response.status_code, 200)
            self.assertFalse(response.json()["hasSerpApiKey"])
            self.assertEqual(SiteAsset.objects.get(key="serpapi_key").url, "")

    def test_map_place_uses_serpapi_when_key_is_set(self):
        from unittest import mock
        from .models import SiteAsset

        class FakeResponse:
            status_code = 200

            def json(self_inner):
                return {"place_results": [{
                    "title": "Gwizineza Market Kabarondo", "address": "Kabarondo, Kayonza, Rwanda",
                    "rating": 4.7, "reviews": 128, "phone": "0788396816", "website": None,
                    "gps_coordinates": {"latitude": -2.0127, "longitude": 30.5585}, "thumbnail": None,
                }]}

        SiteAsset.objects.update_or_create(key="serpapi_key", defaults={"url": "serp-live-key"})
        with self.settings(ADMIN_PASSWORD="", SERPAPI_KEY=""):
            with mock.patch("market.views.requests.get", return_value=FakeResponse()) as fake_get:
                response = self.client.get("/api/map/place")
                self.assertEqual(response.status_code, 200)
                payload = response.json()
                self.assertEqual(payload["source"], "serpapi")
                self.assertEqual(payload["place"]["name"], "Gwizineza Market Kabarondo")
                self.assertEqual(payload["place"]["rating"], 4.7)
                self.assertEqual(fake_get.call_args.kwargs["params"]["api_key"], "serp-live-key")

                # Second call is served from cache without another SerpApi request.
                self.client.get("/api/map/place")
                fake_get.assert_called_once()

    def test_map_place_rejects_foreign_business_and_pins_the_town(self):
        from unittest import mock
        from .models import SiteAsset

        class ForeignBusiness:
            status_code = 200

            def json(self_inner):
                return {"place_results": [{  # single object, not a list
                    "title": "ineza shop trading", "address": "Ngororero, Rwanda",
                    "gps_coordinates": {"latitude": -1.86, "longitude": 29.62},
                }]}

        SiteAsset.objects.update_or_create(key="serpapi_key", defaults={"url": "serp-live-key"})
        with self.settings(ADMIN_PASSWORD="", SERPAPI_KEY=""):
            with mock.patch("market.views.requests.get", return_value=ForeignBusiness()) as fake_get:
                response = self.client.get("/api/map/place")
                self.assertEqual(response.status_code, 200)
                payload = response.json()
                # Never show a nearby business that is not ours.
                self.assertIsNone(payload["place"])
                # Falls back to the configured site coordinates with HTTP 200.
                self.assertEqual(payload["pin"], {"lat": -2.0127, "lng": 30.5585})
                self.assertEqual(payload["source"], "fallback")




class FinanceLedgerTests(TestCase):
    def setUp(self):
        import json
        self.client = Client()
        self.headers = {"HTTP_HOST": "testserver", "HTTP_ORIGIN": "http://testserver"}
        with self.settings(ADMIN_PASSWORD="owner-secret"):
            login = self.client.post(
                "/api/admin/login",
                data=json.dumps({"password": "owner-secret"}),
                content_type="application/json",
                **self.headers,
            )
        self.assertEqual(login.status_code, 200, login.content)
        from .models import PaymentRecord, StoreOrder
        self.PaymentRecord = PaymentRecord
        self.order = StoreOrder.objects.create(
            order_number="GW-FINANCE-TEST-1",
            customer_name="Finance Test Buyer",
            phone="+250788123456",
            customer_email="buyer@example.com",
            delivery_address="Kabarondo",
            subtotal_rwf=12000,
            delivery_rwf=1000,
            total_rwf=13000,
        )
        self.payment = PaymentRecord.objects.create(
            order=self.order,
            method=PaymentRecord.Method.MOMO,
            amount_rwf=self.order.total_rwf,
        )

    def patch_finance(self, payload):
        import json
        return self.client.patch(
            "/api/admin/finance",
            data=json.dumps(payload),
            content_type="application/json",
            **self.headers,
        )

    def test_finance_ledger_requires_admin(self):
        client = Client()
        self.assertEqual(client.get("/api/admin/finance").status_code, 401)
        self.assertEqual(client.patch(
            "/api/admin/finance",
            data='{"id":"%s","status":"PAID"}' % self.payment.id,
            content_type="application/json",
            **self.headers,
        ).status_code, 401)

    def test_ledger_lists_transactions_and_searches_by_order(self):
        response = self.client.get("/api/admin/finance?q=GW-FINANCE-TEST-1", **self.headers)
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(body["summary"]["pendingRwf"], self.order.total_rwf)
        self.assertEqual(body["totalPayments"], 1)
        self.assertEqual(body["payments"][0]["orderNumber"], self.order.order_number)
        self.assertEqual(body["payments"][0]["method"], "MOMO")
        self.assertEqual(body["payments"][0]["status"], "PENDING")

    def test_paid_requires_external_confirmation_and_transaction_reference(self):
        response = self.patch_finance({
            "id": str(self.payment.id), "status": "PAID",
            "note": "Matched provider receipt",
            "externalConfirmation": True,
        })
        self.assertEqual(response.status_code, 400)
        response = self.patch_finance({
            "id": str(self.payment.id), "status": "PAID",
            "note": "Matched provider receipt",
            "externalConfirmation": False,
            "providerRef": "MOMO-REF-123",
        })
        self.assertEqual(response.status_code, 400)

    def test_payment_can_be_confirmed_then_refunded_with_audit_trail(self):
        from .models import AuditLog
        response = self.patch_finance({
            "id": str(self.payment.id), "status": "PAID",
            "note": "Matched actual Mobile Money receipt",
            "providerRef": "MOMO-REF-123",
            "externalConfirmation": True,
        })
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["payment"]["status"], "PAID")
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.provider_ref, "MOMO-REF-123")

        response = self.patch_finance({
            "id": str(self.payment.id), "status": "REFUNDED",
            "note": "Refund sent to the customer outside the website",
            "providerRef": "REFUND-REF-456",
            "externalConfirmation": True,
        })
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["payment"]["status"], "REFUNDED")
        self.assertEqual(
            list(AuditLog.objects.filter(entity_type="PaymentRecord", entity_id=str(self.payment.id))
                 .order_by("created_at").values_list("action", flat=True)),
            ["payment.paid", "payment.refunded"],
        )
        self.assertEqual(
            response.json()["payment"]["history"][-1]["refundReference"],
            "REFUND-REF-456",
        )

    def test_paid_payment_cannot_be_cancelled_or_reopened(self):
        response = self.patch_finance({
            "id": str(self.payment.id), "status": "PAID",
            "note": "Matched actual Mobile Money receipt",
            "providerRef": "MOMO-REF-789",
            "externalConfirmation": True,
        })
        self.assertEqual(response.status_code, 200, response.content)
        response = self.patch_finance({
            "id": str(self.payment.id), "status": "CANCELLED",
            "note": "Try invalid transition",
        })
        self.assertEqual(response.status_code, 409, response.content)
        self.assertEqual(response.json()["error"][:7], "This pa")


    def test_failed_payment_requires_a_structured_reason(self):
        response = self.patch_finance({
            "id": str(self.payment.id), "status": "FAILED",
            "note": "Provider declined the payment",
        })
        self.assertEqual(response.status_code, 400, response.content)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "PENDING")

    def test_failed_payment_is_recorded_with_reason_and_reference_in_audit(self):
        from .models import AuditLog
        response = self.patch_finance({
            "id": str(self.payment.id), "status": "FAILED",
            "note": "Provider returned a declined response",
            "failureReason": "PROVIDER_DECLINED",
            "providerRef": "MOMO-FAIL-123",
        })
        self.assertEqual(response.status_code, 200, response.content)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "FAILED")
        self.assertEqual(self.payment.provider_ref, "MOMO-FAIL-123")
        event = AuditLog.objects.get(entity_type="PaymentRecord", entity_id=str(self.payment.id))
        self.assertEqual(event.action, "payment.failed")
        self.assertEqual(event.metadata["failureReason"], "PROVIDER_DECLINED")
        self.assertEqual(event.metadata["note"], "Provider returned a declined response")

        response = self.client.get(
            "/api/admin/finance?status=FAILED&q=GW-FINANCE-TEST-1",
            **self.headers,
        )
        self.assertEqual(response.status_code, 200, response.content)
        entry = response.json()["payments"][0]
        self.assertEqual(entry["status"], "FAILED")
        self.assertEqual(entry["history"][0]["failureReason"], "PROVIDER_DECLINED")


class NewsletterSubscriptionTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_valid_email_subscribes_and_duplicate_is_idempotent(self):
        payload = '{"email":"MarketUpdates@example.com"}'
        first = self.client.post(
            "/api/newsletter/subscribe",
            data=payload,
            content_type="application/json",
        )
        self.assertEqual(first.status_code, 201)
        self.assertTrue(first.json()["ok"])
        self.assertEqual(
            first.json()["message"],
            "You're subscribed to Gwizineza Market updates.",
        )
        self.assertEqual(
            NewsletterSubscriber.objects.filter(email="marketupdates@example.com").count(),
            1,
        )

        duplicate = self.client.post(
            "/api/newsletter/subscribe",
            data=payload,
            content_type="application/json",
        )
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(
            NewsletterSubscriber.objects.filter(email="marketupdates@example.com").count(),
            1,
        )

    def test_invalid_newsletter_email_is_rejected(self):
        response = self.client.post(
            "/api/newsletter/subscribe",
            data='{"email":"not-an-email"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("valid email", response.json()["error"].lower())
        self.assertEqual(NewsletterSubscriber.objects.count(), 0)

    def test_newsletter_subscription_requires_post(self):
        response = self.client.get("/api/newsletter/subscribe")
        self.assertEqual(response.status_code, 405)



class CustomerWishlistPersistenceTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.customer = CustomerProfile.objects.create(
            supabase_user_id="wishlist-test-user",
            name="Wishlist Buyer",
            email="wishlist@example.com",
        )
        self.product = Product.objects.create(
            sku="WISH-1", name="Saved Umbrella", slug="saved-umbrella",
            price_rwf=2800, stock=5, is_active=True,
        )
        token = signing.dumps(str(self.customer.id), salt="gwizineza-customer")
        self.client.cookies["gwizineza_customer_session"] = token

    def test_customer_can_save_and_remove_wishlist_item(self):
        saved = self.client.post(
            "/api/wishlist",
            data='{"productId":"%s"}' % self.product.id,
            content_type="application/json",
        )
        self.assertEqual(saved.status_code, 201, saved.content)
        self.assertEqual(saved.json()["item"]["productId"], str(self.product.id))
        self.assertEqual(self.customer.wishlist_items.count(), 1)

        listed = self.client.get("/api/wishlist")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual([x["product"]["id"] for x in listed.json()["items"]], [str(self.product.id)])

        removed = self.client.delete(
            "/api/wishlist",
            data='{"productId":"%s"}' % self.product.id,
            content_type="application/json",
        )
        self.assertEqual(removed.status_code, 200, removed.content)
        self.assertEqual(self.customer.wishlist_items.count(), 0)


class SellerProductWorkflowTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.seller = Seller.objects.create(
            business_name="Test Seller", owner_name="Test Owner",
            phone="+250788123456", email="seller@example.com",
            login_username="test-seller", status=Seller.Status.APPROVED,
        )
        self.other_seller = Seller.objects.create(
            business_name="Other Seller", owner_name="Other Owner",
            phone="+250788123457", email="other@example.com",
            login_username="other-seller", status=Seller.Status.APPROVED,
        )
        self.product = Product.objects.create(
            sku="SELLER-1", name="Seller Product", slug="seller-product",
            price_rwf=4000, stock=3, seller=self.seller,
        )
        self.client.cookies["gwizineza_seller_session"] = signing.dumps(
            str(self.seller.id), salt="gwizineza-seller"
        )

    def test_seller_can_update_own_product_stock_and_visibility(self):
        stock_response = self.client.patch(
            "/api/seller/products",
            data='{"id":"%s","stock":9}' % self.product.id,
            content_type="application/json",
        )
        self.assertEqual(stock_response.status_code, 200, stock_response.content)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 9)

        visibility_response = self.client.patch(
            "/api/seller/products",
            data='{"id":"%s","isActive":false}' % self.product.id,
            content_type="application/json",
        )
        self.assertEqual(visibility_response.status_code, 200, visibility_response.content)
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_active)

    def test_seller_cannot_edit_another_sellers_product(self):
        other_product = Product.objects.create(
            sku="SELLER-2", name="Private Product", slug="private-product",
            price_rwf=1000, stock=2, seller=self.other_seller,
        )
        response = self.client.patch(
            "/api/seller/products",
            data='{"id":"%s","stock":99}' % other_product.id,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        other_product.refresh_from_db()
        self.assertEqual(other_product.stock, 2)


class OrderStatusWorkflowTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.order = StoreOrder.objects.create(
            order_number="GW-TEST-STATUS-1", customer_name="Order Buyer",
            phone="+250788123456", delivery_address="Kigali",
            subtotal_rwf=5000, delivery_rwf=0, total_rwf=5000,
            status=StoreOrder.Status.ORDERED,
        )
        with self.settings(ADMIN_PASSWORD="owner-secret"):
            login = self.client.post(
                "/api/admin/login", data='{"password":"owner-secret"}',
                content_type="application/json",
            )
        self.assertEqual(login.status_code, 200)

    def test_admin_can_update_order_status_and_it_persists(self):
        response = self.client.patch(
            "/api/admin/orders",
            data='{"id":"%s","status":"PROCESSING"}' % self.order.id,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, StoreOrder.Status.PROCESSING)
        self.assertEqual(response.json()["order"]["status"], "PROCESSING")


class AdminPaymentLedgerWorkflowTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.order = StoreOrder.objects.create(
            order_number="GW-TEST-PAYMENT-1", customer_name="Finance Buyer",
            phone="+250788123456", delivery_address="Kigali",
            subtotal_rwf=12000, delivery_rwf=1000, total_rwf=13000,
        )
        self.payment = PaymentRecord.objects.create(
            order=self.order, method=PaymentRecord.Method.COD,
            status=PaymentRecord.Status.PENDING, amount_rwf=13000,
        )
        with self.settings(ADMIN_PASSWORD="owner-secret"):
            login = self.client.post(
                "/api/admin/login", data='{"password":"owner-secret"}',
                content_type="application/json",
            )
        self.assertEqual(login.status_code, 200)
        self.headers = {"HTTP_ORIGIN": "http://testserver", "HTTP_HOST": "testserver"}

    def transition(self, status, **extra):
        import json
        body = {"id": str(self.payment.id), "status": status, "note": "Verified by finance"}
        body.update(extra)
        return self.client.patch(
            "/api/admin/finance", data=json.dumps(body),
            content_type="application/json", **self.headers,
        )

    def test_payment_confirmation_requires_external_confirmation_and_is_audited(self):
        rejected = self.transition("PAID")
        self.assertEqual(rejected.status_code, 400)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentRecord.Status.PENDING)

        confirmed = self.transition("PAID", externalConfirmation=True)
        self.assertEqual(confirmed.status_code, 200, confirmed.content)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentRecord.Status.PAID)
        self.assertTrue(AuditLog.objects.filter(
            entity_id=str(self.payment.id), action="payment.paid"
        ).exists())

    def test_refund_requires_paid_status_and_is_audited(self):
        premature = self.transition("REFUNDED", externalConfirmation=True)
        self.assertEqual(premature.status_code, 409)

        self.transition("PAID", externalConfirmation=True)
        refunded = self.transition(
            "REFUNDED", externalConfirmation=True, providerRef="REFUND-TEST-123"
        )
        self.assertEqual(refunded.status_code, 200, refunded.content)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentRecord.Status.REFUNDED)
        self.assertTrue(AuditLog.objects.filter(
            entity_id=str(self.payment.id), action="payment.refunded"
        ).exists())

    def test_pending_payment_cancellation_persists_and_cannot_be_marked_paid_afterward(self):
        cancelled = self.transition("CANCELLED")
        self.assertEqual(cancelled.status_code, 200, cancelled.content)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentRecord.Status.CANCELLED)

        invalid = self.transition("PAID", externalConfirmation=True)
        self.assertEqual(invalid.status_code, 409)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, PaymentRecord.Status.CANCELLED)
