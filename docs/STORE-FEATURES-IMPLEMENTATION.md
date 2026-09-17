# Gwizineza Market — Storefront & Operations Implementation

This document records the selected improvements and the implementation boundaries for the current Next.js application.

## Repository baseline

The current home page is a client component that loads products from `/api/products`, maintains a cart through `/api/cart`, and submits customer name, phone, and delivery address to `/api/checkout`. The page displays product cards and an order confirmation. Admin routes already exist for login, products, and orders. This is a foundation, not proof that all controls are production-secure or fully implemented.

## Selected work

### Storefront
- Refresh the hero with a clear value proposition, primary shopping action, and trust cues; preserve responsive behavior and accessibility.
- Add product search and category filtering with an explicit empty state and reset action.
- Improve product cards: consistent image aspect ratio, price, stock state, category, and disabled add-to-cart when unavailable.
- Keep cart operations server-backed; show loading/error feedback and prevent duplicate checkout submissions.

### Checkout, delivery, and tracking
- Show subtotal, delivery fee, and grand total separately. Delivery fee must be calculated/validated on the server from an admin-managed delivery rule, not trusted from a browser field.
- Validate name, Rwandan phone input, and delivery address on the server; return field-safe errors.
- Create a customer-facing order tracking view using a non-guessable order access token or authenticated ownership. Do not expose orders by sequential order number alone.
- Define order statuses consistently: pending, confirmed, preparing, out_for_delivery, delivered, cancelled. Record status changes with timestamps and authorized actor.
- Do not claim payment is complete until a provider callback/webhook is verified. Mobile Money/card provider selection and credentials remain a separate configuration step.

### Admin and seller access
- Admin dashboard should summarize orders, products, sellers, and inventory using server-authorized data.
- Admin alone may invite/activate/deactivate sellers and assign seller ownership to products.
- Seller endpoints must scope every read/write to the authenticated seller's own records. Never rely on hidden UI controls as authorization.
- Enforce role checks in server handlers and middleware; protect against missing/expired sessions and unauthorized direct API calls.
- Audit important changes (seller status, product edits, order status, delivery settings).

### WhatsApp
- Provide a click-to-open WhatsApp message draft with order reference, items, total, and delivery summary only after successful order creation.
- The customer manually sends the draft in ordinary WhatsApp; do not represent it as automated delivery or an official EBM receipt. Avoid including secrets or unnecessary personal data in the URL.

### Security, testing, deployment
- Validate and normalize all incoming API data; use parameterized Prisma queries and server-side authorization.
- Keep credentials in deployment environment variables; never commit `.env` secrets. Use least-privilege database credentials and production HTTPS.
- Add tests for product filtering, cart stock limits, checkout validation, delivery calculation, seller isolation, admin-only seller management, and order-status authorization.
- CI should run install, lint, typecheck, and tests; deployment should use a managed production host with configured database migrations, environment variables, health checks, and rollback procedure.

## Release gates

1. Confirm schema and current auth/session implementation before changing protected routes.
2. Add migrations and tests alongside each backend feature.
3. Verify seller A cannot read or modify seller B's data using direct API requests.
4. Verify delivery amount is server-calculated and stable at checkout.
5. Verify order tracking does not disclose another customer's order.
6. Run lint, typecheck, tests, and production build before merge.
7. Configure provider credentials and verified callbacks before enabling real payments.

## Explicitly not enabled by this document

No payment provider, automated WhatsApp sending, or EBM/RRA integration is activated by this planning document. These require provider credentials, official integration requirements, and separate implementation/testing.