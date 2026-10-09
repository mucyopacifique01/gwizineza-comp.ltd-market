# Store feature implementation

The frontend continues to use its existing /api request contracts. Those requests are now proxied to Django rather than handled by Next.js API route handlers. Django validates requests, enforces the customer/seller/owner role checks and uses Django ORM against Supabase PostgreSQL.

Implemented API groups include product/search filters, categories, cart, transactional checkout and stock reservation, order lookup/history, seller products/gallery/orders/stats, owner seller/product/order management, customer OTP/profile, wishlist, review moderation, support tickets, CMS posts, delivery zones, settings, payment records and diagnostics.

## External integrations still required

- Supabase Auth email OTP requires SMTP and the numeric-token email template.
- Supabase Auth phone OTP requires the Send SMS Hook endpoint and TextBee configuration.
- Online Mobile Money/card payment requires merchant accounts, payment request APIs and verified provider webhooks.
- EBM invoicing requires confirming the official Rwanda integration path.
- Automated WhatsApp receipts require an approved WhatsApp Business integration and order/payment event handling.

Never mark a remote payment as PAID without verifying a provider-signed webhook. Do not describe the order confirmation as an official tax invoice until EBM issuance has been implemented.
