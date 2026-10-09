# Gwizineza Django API (migration foundation)

This service is the new Python/Django REST backend foundation using PostgreSQL hosted by Supabase. The existing Next.js application currently has legacy API routes and MongoDB/Prisma assumptions; this service is deliberately isolated until the frontend is switched endpoint-by-endpoint and data is migrated. Do not remove MongoDB or point production traffic here until migrations and integration tests pass.

## Local setup

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate | macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # set variables in your shell; Django does not auto-load .env files
python manage.py migrate
python manage.py createsuperuser
python manage.py test
python manage.py runserver
```

## Supabase PostgreSQL

In Supabase, open **Project Settings → Database** and copy the connection URI. Set `DATABASE_URL` to the URI using the pooler/session mode appropriate for your host; preserve the password URL-encoding. Use `DATABASE_SSL_REQUIRE=true` when the host requires SSL. Never commit production credentials. Run `python manage.py migrate` as a deployment release step.

## Routes

- `GET /api/health/` — database connectivity health (503 if DB is unavailable)
- `GET /api/products/` — active products from approved sellers; supports `search`, `category`, `featured`, `minPrice`, `maxPrice`, `ordering`, `page`
- `GET /api/categories/` — category list
- `/admin/` — Django admin (create a superuser first)

## Supabase Auth

The frontend must send a Supabase access token as `Authorization: Bearer <token>` for protected API requests. Before exposing customer/order/seller/admin endpoints, validate tokens server-side with Supabase Auth and enforce role/object-level permissions. Do not trust user IDs or role names supplied in request bodies. This initial foundation intentionally exposes only public catalog reads and Django's admin login; order creation, stock reservation, payment webhooks, EBM, and automated WhatsApp receipts must be implemented and tested before production checkout is routed to Django.

## Deploy

Deploy `backend/` as a separate Python web service (e.g. Render root directory `backend`) with build command `pip install -r requirements.txt` and start command `gunicorn config.wsgi:application`. Configure `DATABASE_URL`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, and `DATABASE_SSL_REQUIRE=true` as appropriate. Run migrations before starting traffic. `DEBUG` defaults to false.
