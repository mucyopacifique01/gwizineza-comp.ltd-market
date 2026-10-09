# Implementation roadmap

## Current architecture

- Responsive Next.js 14 / React / TypeScript frontend, including the Figma marketplace, owner and seller screens.
- Django 5.2 API using Django ORM.
- Supabase PostgreSQL as the only application database.
- Supabase Auth for customer email/SMS OTP and Supabase Storage for product images.
- Next.js /api routes are a proxy to DJANGO_API_URL; application logic no longer lives in Next.js route handlers.

## Immediate launch checks

1. Configure the Supabase PostgreSQL connection string on the Django service.
2. Configure Supabase email OTP template/SMTP and the SMS hook to Django + TextBee.
3. Run backend tests, route audit, TypeScript, lint and frontend build.
4. Verify all customer, seller and owner screens with real service environment variables.
5. Test stock updates and checkout transactions with concurrent requests.
6. Add provider-verified Mobile Money/card checkout before collecting online payment.
7. Confirm Rwanda EBM requirements and the supported integration path with RRA or a qualified accountant before issuing tax invoices.

## Explicit constraints

CI cannot prove OTP delivery without live provider credentials. The included sample seed inserts demo products into the new Supabase database. MongoDB records are not automatically imported. Payment methods displayed in UI are not live collection until provider APIs and signed payment webhooks are implemented.
