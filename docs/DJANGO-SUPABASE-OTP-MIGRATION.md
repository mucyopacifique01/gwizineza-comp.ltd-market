# Django + Supabase + OTP migration

## Target topology

\`\`\`text
Browser
  └── Next.js / React (Figma screens and responsive layouts)
        └── same-origin /api/* proxy (middleware.ts)
              └── Django JSON API
                    ├── Django ORM → Supabase PostgreSQL
                    ├── Supabase Auth → validates customer access tokens
                    ├── Supabase Storage → product images
                    └── Supabase Auth Send SMS Hook → TextBee
\`\`\`

Next.js remains the presentation layer. Business/data API logic lives in Django. Supabase PostgreSQL is the only application database. Supabase Auth sends and verifies email/phone OTPs; Django validates access tokens against the Supabase Auth user endpoint before allowing customer-protected API requests.

## Main behaviours

- Public product queries return active products from marketplace inventory and approved sellers.
- Checkout validates stock inside a transaction, decrements inventory, creates the order and a pending payment record.
- A pending payment record is not proof that Mobile Money or card payment succeeded.
- Seller product routes scope writes to the seller's authenticated session.
- Admin routes require a signed Django admin cookie. The owner signs in with ADMIN_PASSWORD.
- Customer API routes validate a Supabase bearer token forwarded from Next.js.
- Guest order lookup uses the order number as a tracking reference; treat it as private.
- API errors do not expose SQL, credentials, tokens or stack traces.

## One-time-code sign-in

The /auth page uses Supabase JS signInWithOtp and verifyOtp. Email verification uses type email; mobile verification uses type sms. It does not offer customer password login or Google sign-in.

For email, configure real SMTP delivery in Supabase Auth and update the template to display {{ .Token }} so users can enter the numeric code. For phones, configure the Supabase Auth Send SMS Hook to the Django endpoint. It validates the hook ID, timestamp and HMAC signature, then forwards the OTP to TextBee. It rejects stale or invalid signatures and never returns the code to the browser.

SMS environment variables:
- SUPABASE_SEND_SMS_HOOK_SECRET
- TEXTBEE_API_KEY
- TEXTBEE_DEVICE_ID (optional if your TextBee account does not require an explicit device)

Set the exact Supabase-generated signing secret. The SMS hook URL must target the Django service directly, not the Next.js proxy.

## Supabase PostgreSQL

Django ORM models cover categories, sellers, customer profiles, products, product images, carts, cart items, orders, order items, payments, wishlist items, reviews, support tickets, content posts, delivery zones, site settings and audit logs.

Run manage.py migrate --run-syncdb --noinput to create tables for this initial, migration-light setup. Add formal Django migration files before coordinating future production schema updates across multiple developers.

Set DATABASE_URL to a valid Supabase PostgreSQL connection string with SSL. Never commit credentials to GitHub or place service-role credentials in NEXT_PUBLIC variables.

## Launch prerequisites

- Supabase PostgreSQL connection string.
- Supabase project URL and public anon/publishable key.
- Server-only Supabase service-role key for image upload.
- SMTP provider and numeric email OTP template.
- Supabase Phone Auth / Send SMS Hook and TextBee credentials.
- DJANGO_SECRET_KEY and ADMIN_PASSWORD.
- DJANGO_API_URL in the frontend service.

Online Mobile Money/card processing, automatic WhatsApp messages and official EBM/RRA fiscal documents require separate provider/integration work and are not activated by this migration.
