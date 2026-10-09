# Django API and Supabase PostgreSQL

## Architecture

The Next.js frontend forwards every /api/* request through app/api/[...path]/route.ts to DJANGO_API_URL. Django owns the API, authorization and business logic. Django ORM connects to Supabase-hosted PostgreSQL using DATABASE_URL. Supabase Auth verifies customer email/SMS OTPs, while Django stores a customer profile linked to the Supabase Auth user ID and issues a signed HttpOnly session cookie. Supabase Storage stores product pictures.

Prisma, MongoDB drivers, Prisma schema and MongoDB index scripts are removed. Do not add a second database engine.

## Important endpoint groups

- Catalog: GET/POST /api/products, GET/PATCH/DELETE /api/products/<id-or-slug>, GET/POST/PATCH /api/categories.
- Cart and checkout: GET/POST/DELETE /api/cart, POST /api/checkout, GET /api/orders/<order-number>.
- OTP accounts: POST /api/customer/auth/otp/send and /api/customer/auth/otp/verify; GET/PATCH /api/customer/me and /api/customer/account; POST /api/customer/auth/logout.
- Orders: GET /api/customer/orders, GET/PATCH /api/admin/orders, GET /api/seller/orders.
- Seller: POST /api/seller/auth/login, POST /api/seller/auth/logout, GET/PATCH /api/seller/me, GET/POST/PATCH /api/seller/products, GET /api/seller/stats.
- Owner: admin login/logout, sellers, product/category management, stats, customers, finance, settings, reviews, support, delivery zones and image uploads.
- Engagement: wishlist, reviews, customer support tickets, CMS posts and delivery zones.
- Operations: GET /api/health and GET /api/admin/diagnostics/database.

Responses use camelCase names to match the existing React frontend. Authorization is enforced by Django for admin/seller/customer APIs; the Next.js middleware is only an early navigation redirect.

## OTP delivery

1. Frontend POSTs a contact and optional name to /api/customer/auth/otp/send.
2. Django normalizes the email or phone and asks Supabase Auth to send an OTP.
3. For email, configure an SMTP provider and an email template that renders the numeric token.
4. For phone, configure the Supabase Auth Send SMS Hook to /api/auth/send-sms-hook. Django verifies the signed hook request and sends the supplied code through TextBee.
5. Frontend POSTs contact and code to /api/customer/auth/otp/verify. Django asks Supabase Auth to validate it, persists the linked profile and sets the signed customer cookie.

Do not log OTPs or return Supabase service-role keys. The code has basic per-process OTP send throttling; for a multi-instance high-traffic production launch, move that throttle to a shared cache.

## Local check commands

- pip install -r backend/requirements.txt
- python backend/manage.py check
- python backend/manage.py test (requires PostgreSQL configured by DATABASE_URL)
- python backend/manage.py migrate --run-syncdb --noinput
- python backend/manage.py seed_marketplace
- npm install --include=optional
- npm run check:figma-routes
- npx tsc --noEmit
- npm run lint
- npm run build

## Known launch dependencies

Configure Supabase PostgreSQL credentials, Supabase Auth email SMTP, SMS hook settings and TextBee secrets in the appropriate service environment. CI does not send real OTPs. Online payment, EBM issuance and automated WhatsApp receipts need provider-specific implementations and credentials; they are not enabled by setting a payment method to MOMO or CARD.
