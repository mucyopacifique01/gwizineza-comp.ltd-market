# Implementation and launch checklist

## Architecture

- Frontend: Next.js 14 / React 18 / TypeScript with Figma-derived screens and responsive variants.
- Backend: Django JSON API in backend/.
- Database: Supabase PostgreSQL only.
- Customer auth: Supabase email OTP and phone SMS OTP.
- Product images: Supabase Storage.
- SMS hook: Django verifies Supabase's signed webhook and forwards to TextBee.

## Release checklist

- [ ] Set Supabase PostgreSQL DATABASE_URL on the Django service.
- [ ] Run manage.py migrate --run-syncdb --noinput and manage.py seed_catalog.
- [ ] Configure Supabase Email provider, SMTP and an OTP template displaying {{ .Token }}.
- [ ] Configure Phone Auth / Send SMS Hook, hook secret and TextBee credentials.
- [ ] Set frontend DJANGO_API_URL to the deployed Django service.
- [ ] Test admin and seller sign-in; verify suspended sellers cannot edit products.
- [ ] Test products, categories, cart, stock checks, checkout, order lookup and customer order history.
- [ ] Test mobile/tablet breakpoints across the responsive Figma variants.
- [ ] Test image upload and public image URLs.
- [ ] Configure a payment provider sandbox and verified webhooks before accepting online payments.
- [ ] Confirm Rwanda RRA/EBM requirements before displaying any receipt as a fiscal invoice.
- [ ] Import legacy catalog/seller/order data only if it must be preserved.

## Not enabled by this migration

Mobile Money/card payment processing, automated WhatsApp delivery and official EBM receipts are not enabled merely by creating an order or Payment row.
