# Django + Supabase PostgreSQL transition

## Goal

Move Gwizineza Market's backend to a versioned Django REST API backed by Supabase PostgreSQL. The existing Next.js/Prisma/MongoDB APIs remain in place during the transition so the customer-facing website is not accidentally taken offline.

## Backend structure

- backend/config/ contains environment-driven Django settings and URL routing.
- backend/marketplace/ contains relational models, API serializers, permissions, views and admin registration.
- /api/health/ checks the database connection.
- /api/v1/ is the versioned API prefix.
- Supabase Auth bearer tokens are validated server-side; the frontend passes its current access token to the Django service.
- Django admin is available at /django-admin/ after a staff account is created.

## Initial route map

| Frontend area | Django API |
| --- | --- |
| Shop, search, product listing and product detail | GET /api/v1/products/ and GET /api/v1/products/{id}/ |
| Categories | GET /api/v1/categories/ |
| Seller storefronts | GET /api/v1/sellers/ and GET /api/v1/sellers/{slug}/ |
| Customer profile | GET/PATCH /api/v1/me/ |
| Cart | GET/POST/PATCH/DELETE /api/v1/cart/ |
| Wishlist | GET/POST/DELETE /api/v1/wishlist/ |
| Checkout | POST /api/v1/checkout/ |
| Customer order history/tracking | GET /api/v1/orders/ and GET /api/v1/orders/{order_number}/ |
| Reviews | GET/POST /api/v1/reviews/ |
| Customer support | GET/POST /api/v1/support/tickets/ |
| Delivery | GET /api/v1/delivery-zones/ |
| Payment records | GET /api/v1/payments/ |
| Published blog/CMS content | GET /api/v1/content/ |
| Seller dashboard | GET /api/v1/seller/dashboard/ |
| Owner/admin dashboard summary | GET /api/v1/admin/dashboard/ |

The list/detail endpoints are initial API coverage, not proof that all 31 Figma screens have been wired to Django yet. Frontend components, admin write screens and route-by-route browser tests still need integration work.

## Data and launch safety

1. Create/verify the Supabase PostgreSQL project and take a backup before migrating any live customer or order data.
2. Deploy Django as a separate service, set environment values, apply migrations and verify /api/health/.
3. Seed initial categories, configure approved sellers and products, and configure delivery zones in Django admin.
4. Connect one frontend feature at a time to the new /api/v1/ service, beginning with public categories/products.
5. Add Supabase access tokens to authenticated API calls. Never trust a role claim from the browser; approve sellers and assign staff privileges on the server.
6. Test product filtering, seller isolation, stock validation, duplicate cart lines, checkout totals and unauthorized access.
7. Import MongoDB products, sellers and orders only after field mapping and validation scripts are reviewed. Never perform a blind copy into the production database.
8. Do not switch the whole frontend or remove Prisma/MongoDB until critical customer, seller and admin routes have parity and smoke tests pass.

## Explicitly not active yet

- MTN Mobile Money, Airtel Money and card collection. The checkout API currently accepts cash on delivery only.
- Payment provider webhooks and payment reconciliation.
- Official Rwanda Revenue Authority EBM invoice generation or TIN validation.
- Automated WhatsApp order/EBM delivery.
- Automated migration of MongoDB's current production records into PostgreSQL.

These need provider credentials, verified callbacks, operational decisions and/or local compliance review before being described as live.
