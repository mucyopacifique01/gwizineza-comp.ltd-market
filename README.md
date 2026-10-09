# Gwizineza Market

Owner and creator: Mucyo Pacifique. Location: Kabarondo, Rwanda.

Gwizineza Market is a responsive multi-seller marketplace. The existing Next.js / React / TypeScript frontend remains the customer-facing web application. All application API and business logic is served by Django. Supabase PostgreSQL is the only application database; Supabase Auth handles customer OTP verification and Supabase Storage stores product images.

## Stack

- Frontend: Next.js 14, React 18 and TypeScript.
- Backend: Django 5.2 and Django ORM.
- Database: Supabase-hosted PostgreSQL only.
- Authentication: email OTP and phone SMS OTP through Supabase Auth; Django issues a same-site HttpOnly customer session cookie after verification.
- Product images: Supabase Storage.
- Deployment: separate frontend and Django web services described by render.yaml.

Prisma and MongoDB have been removed from the application dependencies and runtime configuration. Google sign-in and customer passwords have been removed in favor of email/phone one-time codes. Owner and seller consoles remain separately protected; sellers are created by the owner.

## Run locally

1. Install Node.js 20+ and Python 3.12.
2. Create a Supabase project. Copy its PostgreSQL connection URI, project URL, anon key and service-role key from the Supabase dashboard.
3. Create the frontend environment file from .env.example at the repository root. Set DJANGO_API_URL to http://127.0.0.1:8000 and the public Supabase values.
4. Configure the backend environment variables in your shell or backend/.env, especially DATABASE_URL, DJANGO_SECRET_KEY, ADMIN_PASSWORD, SUPABASE_URL and SUPABASE_ANON_KEY.
5. From backend/, run: pip install -r requirements.txt
6. Run: python manage.py migrate --run-syncdb --noinput
7. Run: python manage.py seed_marketplace
8. Start Django with: python manage.py runserver 8000
9. In a second terminal at the repository root, run: npm install and then npm run dev.
10. Open http://localhost:3000.

DATABASE_URL belongs to the Django service and must point to Supabase PostgreSQL, not MongoDB. Do not commit production secrets.

## OTP configuration

- In Supabase Authentication, enable Email and Phone providers.
- Set the email template to include the numeric token using Supabase's token template variable ({{ .Token }}); configure a reliable SMTP provider before production.
- In Supabase Auth Hooks, configure the Send SMS hook to the Django URL /api/auth/send-sms-hook if using TextBee. Set SUPABASE_SEND_SMS_HOOK_SECRET, TEXTBEE_API_KEY and optionally TEXTBEE_DEVICE_ID on the Django service. Verify the hook secret format in the Supabase dashboard.
- Add the deployed frontend origin to the Supabase Auth allowed URL/site configuration when required.
- Test OTP delivery and verification with a real phone and email before launch. Provider credentials and successful delivery cannot be tested by CI.

## Seed catalog

Run python manage.py seed_marketplace from the backend directory to insert the sample grocery, soap and everyday products. This seeds the new Supabase database; it does not import records from the old MongoDB database.

## Deployment

Render is configured for two services in render.yaml: the Next.js frontend and Django API. Set the Django service's DATABASE_URL to the Supabase PostgreSQL connection string, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD, TextBee settings and the SMS hook secret. Set the frontend public Supabase URL/key. Render links DJANGO_API_URL to the Django service URL.

The database schema currently uses Django's syncdb path for the market app at deployment. Before a production launch with existing customer/order data, create and review versioned Django migrations and plan any legacy-data import separately.

## Limitations to keep explicit

- OTP sending relies on Supabase Auth; phone delivery requires the SMS Send Hook and a working TextBee account, and email delivery requires a configured SMTP provider.
- Online MTN Mobile Money, Airtel Money, card processing, automatic EBM invoicing and automatic WhatsApp receipts are not activated merely by this migration. Payment records are bookkeeping until a provider integration and verified webhook are configured.
- Existing MongoDB records are not automatically copied into Supabase PostgreSQL. The included command seeds demo products; production data import must be planned separately.
