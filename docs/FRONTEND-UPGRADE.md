# Frontend and backend upgrade

The current storefront uses Next.js 14, React 18, TypeScript and plain CSS. The Figma work remains the source for the 31 functional desktop/tablet/mobile screen designs and their responsive variants.

## Runtime architecture

- Next.js serves the customer storefront, owner console and seller console.
- The catch-all route at app/api/[...path]/route.ts forwards application API calls to DJANGO_API_URL.
- Django 5.2 and Django ORM implement API business logic and authorization.
- Supabase PostgreSQL is the sole application database.
- Supabase Auth verifies customer one-time codes; Supabase Storage stores product images.
- MongoDB and Prisma are not part of the runtime or dependency tree.

## OTP sign-in

Customer sign-in and account creation use a one-time code sent to either email or phone. The frontend sends the code request to Django. Django asks Supabase Auth to send/verify it and creates a customer profile for the verified Supabase Auth identity. After verification, Django returns an HttpOnly signed session cookie.

Email OTP needs an SMTP provider and a Supabase email template containing the token. Phone OTP needs the Supabase Auth Send SMS Hook configured to call the Django SMS-hook endpoint, plus working TextBee credentials.

## Functional coverage

Django exposes compatibility endpoints for products, categories, cart, checkout, orders, customer profile/orders, wishlist, reviews, support tickets, CMS content, delivery zones, payments bookkeeping, admin settings and seller/admin management. Existing frontend fetch URLs remain under /api.

## Launch gates

- Set DJANGO_API_URL on the frontend service.
- Set DATABASE_URL to the Supabase PostgreSQL URI on the Django service.
- Configure Supabase Auth SMTP, phone SMS hook, and TextBee.
- Run Python backend tests and Node type-check/lint/build in CI.
- Smoke-test OTP, catalog, checkout, role access, image uploads and every functional page against the deployed services.
- Import existing MongoDB data separately if the current production dataset must be preserved; the sample seed command populates demo products in Supabase but does not migrate old records.

Online payment collection, official EBM invoicing and automated WhatsApp receipts are not enabled by this architecture change alone.
