# Gwizineza Market — Django API

This directory is the new Python backend for the Gwizineza Market website. It uses Django 6.1, Django REST Framework, PostgreSQL, and Supabase Auth token verification.

The existing Next.js frontend and legacy Next.js API routes remain in the repository while API parity and data migration are built. Do not delete the old MongoDB/Prisma backend or point the production frontend at this API until the migration checklist is completed.

## Local development

Use Python 3.12, 3.13, or 3.14.

1. Create and activate a virtual environment.
2. Install dependencies with: pip install -r requirements.txt
3. Copy .env.example to .env and load those values in your shell.
4. For local development, the app uses SQLite when DATABASE_URL is empty. For a real Supabase database, set DATABASE_URL to its PostgreSQL connection string.
5. Run: python manage.py migrate
6. Create an admin user with: python manage.py createsuperuser
7. Run: python manage.py runserver 0.0.0.0:8000

API health: /api/health/
Django admin: /django-admin/
API prefix: /api/v1/

## Supabase PostgreSQL

In Supabase, open Project Settings, select Database, then Connect. Prefer the Session pooler connection string for a long-running Django service if the direct database host is not reachable from your hosting environment. Require SSL in production. URL-encode reserved characters in the database password before putting the URL into DATABASE_URL.

Use the database connection string for the server only. Never put DATABASE_URL, the database password, SUPABASE_JWT_SECRET, or a Supabase service-role key in a NEXT_PUBLIC variable or in browser JavaScript.

## Supabase Auth

Set SUPABASE_URL for your project. The API validates access tokens using the Supabase JWKS endpoint at SUPABASE_JWKS_URL. For legacy HS256-signed projects, SUPABASE_JWT_SECRET may be set as a server-only fallback. The token is sent from the frontend as:

    Authorization: Bearer <session.access_token>

A valid Supabase token is mapped to a Django User and UserProfile by its subject ID. Privileges are not read from user-editable JWT metadata: seller approval and Django staff permissions must be granted from the trusted server/admin side.

The browser's Supabase anon/publishable key can remain in the frontend as required for Supabase Auth. It is not the database credential.

## First API coverage

- Public product catalogue with category, seller, search, price, featured and ordering filters.
- Public categories and approved seller storefront data.
- Supabase-token authenticated profile, cart, wishlist, order history, checkout, reviews and support tickets.
- Seller dashboard metrics scoped to the authenticated seller.
- Staff-only marketplace dashboard and standard Django admin management for sellers, products, categories, delivery zones, orders, payments, review moderation, support and content.
- Delivery fees are taken from active delivery zones configured by staff.
- Checkout validates stock server-side and deducts it atomically.
- Cash on delivery is the only enabled checkout method. MTN Mobile Money, Airtel Money, cards, official EBM invoices and automated WhatsApp receipts remain inactive until their providers/compliance flows are implemented.

## Deploying as a separate Render service

Create a new Web Service using this repository and set the Root Directory to backend.

- Runtime: Python
- Build command: pip install -r requirements.txt
- Start command: python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
- Health check path: /api/health/

Configure these server-side environment variables in the hosting dashboard:

- DJANGO_SECRET_KEY — generate a strong secret.
- DJANGO_DEBUG=False
- DJANGO_ALLOWED_HOSTS — include the backend hostname.
- FRONTEND_URL — the deployed website origin.
- CORS_ALLOWED_ORIGINS — comma-separated trusted frontend origins.
- DATABASE_URL — the Supabase PostgreSQL session-pooler connection URL with SSL.
- SUPABASE_URL and optionally SUPABASE_JWKS_URL.
- SECURE_SSL_REDIRECT=True

Keep the existing frontend service running independently until it has been migrated and fully tested against this API.
