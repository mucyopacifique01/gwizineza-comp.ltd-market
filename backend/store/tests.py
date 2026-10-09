import base64
import hashlib
import hmac
import json
import time
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings

from .models import Cart, CartItem, Category, Order, OrderItem, Payment, Product, Seller


class CatalogApiTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Groceries", slug="groceries")
        self.live_product = Product.objects.create(
            sku="RICE-001", name="Rice 5kg", slug="rice-5kg",
            price_rwf=8500, stock=10, is_active=True, category=self.category,
        )
        self.suspended = Seller.objects.create(
            business_name="Suspended Seller", owner_name="Owner",
            phone="+250780000001", login_username="suspended",
            password_hash="unused", status=Seller.Status.SUSPENDED,
        )
        Product.objects.create(
            sku="HIDDEN-001", name="Hidden stock", slug="hidden-stock",
            price_rwf=1000, stock=10, is_active=True, category=self.category,
            seller=self.suspended,
        )
        Product.objects.create(
            sku="ARCHIVED-001", name="Archived", slug="archived",
            price_rwf=1000, stock=10, is_active=False, category=self.category,
        )

    def test_health_reports_database(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["provider"], "Supabase PostgreSQL")

    def test_public_catalog_hides_archived_and_suspended_seller_products(self):
        response = self.client.get("/api/products")
        self.assertEqual(response.status_code, 200)
        names = [product["name"] for product in response.json()["products"]]
        self.assertIn("Rice 5kg", names)
        self.assertNotIn("Hidden stock", names)
        self.assertNotIn("Archived", names)

    def test_cart_checkout_decrements_stock_and_creates_pending_payment(self):
        cart = Cart.objects.create()
        CartItem.objects.create(cart=cart, product=self.live_product, quantity=2)
        response = self.client.post("/api/checkout", data=json.dumps({
            "cartId": str(cart.id),
            "customerName": "Test Customer",
            "phone": "0781234567",
            "deliveryAddress": "Kabarondo, Rwanda",
            "paymentMethod": "COD",
        }), content_type="application/json")
        self.assertEqual(response.status_code, 201, response.content.decode())
        payload = response.json()
        order = Order.objects.get(order_number=payload["order"]["orderNumber"])
        self.live_product.refresh_from_db()
        self.assertEqual(self.live_product.stock, 8)
        self.assertEqual(order.total_rwf, 17000)
        self.assertEqual(Payment.objects.get(order=order).status, Payment.Status.PENDING)
        self.assertEqual(CartItem.objects.filter(cart=cart).count(), 0)
        self.assertEqual(OrderItem.objects.filter(order=order).count(), 1)

    def test_seller_api_requires_seller_session(self):
        response = self.client.get("/api/seller/products")
        self.assertEqual(response.status_code, 401)


class SmsOtpHookTests(TestCase):
    @override_settings(SUPABASE_SEND_SMS_HOOK_SECRET="", TEXTBEE_API_KEY="", TEXTBEE_DEVICE_ID="")
    def test_sms_hook_rejects_unconfigured_provider(self):
        response = self.client.post("/api/auth/send-sms-hook", data="{}", content_type="application/json")
        self.assertEqual(response.status_code, 503)

    def test_sms_hook_verifies_signature_before_sending(self):
        key = b"test-webhook-signing-key"
        signing_secret = "v1,whsec_" + base64.b64encode(key).decode("ascii")
        timestamp = str(int(time.time()))
        hook_id = "msg_test_123"
        payload = json.dumps({"user": {"phone": "+250780000000"}, "sms": {"otp": "123456"}}).encode()
        signed_content = hook_id.encode() + b"." + timestamp.encode() + b"." + payload
        signature = base64.b64encode(hmac.new(key, signed_content, hashlib.sha256).digest()).decode()
        with override_settings(
            SUPABASE_SEND_SMS_HOOK_SECRET=signing_secret,
            TEXTBEE_API_KEY="test-key",
            TEXTBEE_DEVICE_ID="test-device",
        ), patch("store.views.requests.post", return_value=Mock(status_code=200)) as send_sms:
            response = self.client.generic(
                "POST", "/api/auth/send-sms-hook", data=payload, content_type="application/json",
                HTTP_WEBHOOK_ID=hook_id, HTTP_WEBHOOK_TIMESTAMP=timestamp,
                HTTP_WEBHOOK_SIGNATURE="v1," + signature,
            )
        self.assertEqual(response.status_code, 200, response.content.decode())
        sent_body = send_sms.call_args.kwargs["json"]
        self.assertEqual(sent_body["recipients"], ["+250780000000"])
        self.assertIn("123456", sent_body["message"])

    def test_sms_hook_rejects_wrong_signature(self):
        key = b"test-webhook-signing-key"
        signing_secret = "v1,whsec_" + base64.b64encode(key).decode("ascii")
        with override_settings(SUPABASE_SEND_SMS_HOOK_SECRET=signing_secret, TEXTBEE_API_KEY="test-key"):
            response = self.client.generic(
                "POST", "/api/auth/send-sms-hook",
                data=b'{"user":{"phone":"+250780000000"},"sms":{"otp":"123456"}}',
                content_type="application/json",
                HTTP_WEBHOOK_ID="msg_test", HTTP_WEBHOOK_TIMESTAMP=str(int(time.time())),
                HTTP_WEBHOOK_SIGNATURE="v1,invalid",
            )
        self.assertEqual(response.status_code, 401)
