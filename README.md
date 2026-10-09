# Gwizineza Market

**Owner & creator:** Mucyo Pacifique  
**Location:** Kabarondo, Rwanda

Gwizineza Market is a multi-seller e-commerce marketplace. This branch uses Next.js/React for the Figma-based interface, Django for the API, and Supabase PostgreSQL as the only application database.

## Architecture

- **Frontend:** Next.js 14, React 18, TypeScript, responsive CSS.
- **Backend:** Django 5 JSON API under backend/.
- **Database:** Supabase PostgreSQL via Django ORM. MongoDB and Prisma are removed from this branch.
- **Customer authentication:** Supabase Auth email OTP and phone SMS OTP. Customer passwords and Google sign-in are not used.
- **SMS delivery:** Supabase Auth Send SMS Hook validates with Django, then forwards the OTP to TextBee.
- **Email delivery:** Supabase Auth sends numeric email codes using your configured SMTP provider and email template.
- **Images:** Supabase Storage.
- **Deployment:** Separate Render web services for the Next.js frontend and Django API.

The Figma inventory is **31 functional screens plus 16 mobile/tablet responsive variants** (47 designs total). Responsive variants use the same API and data models.

## Backend coverage

Django provides endpoints for products, product details and images, categories, sellers, carts, checkout, orders, customer profiles/order history, wishlist, reviews, support tickets, content posts, delivery zones, payments, admin reporting/settings, seller products/orders/stats, image uploads and database health.

External integrations still need provider configuration. Mobile Money/card payment processing and official RRA/EBM receipts are **not activated** by this migration. Payment records are marked pending and the API declares the provider as not configured until a payment provider and verified webhook are implemented.

## Run locally

### 1. Configure Supabase

Create a Supabase project. In **Project Settings → Database**, copy a PostgreSQL connection string. For server hosting, the session pooler is often useful when a host cannot connect directly over IPv6.

Create a Storage bucket named product-images. Configure public reads if the storefront should render product images directly from public Storage URLs.

Copy .env.example to .env and fill in at least:

- DATABASE_URL: the Supabase PostgreSQL URL, never a MongoDB URL.
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (Django only; never expose to the browser)
- DJANGO_SECRET_KEY
- ADMIN_PASSWORD

### 2. Start Django

From the repository root:

\`\`\`bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py check
python manage.py migrate --run-syncdb --noinput
python manage.py seed_catalog
python manage.py runserver 0.0.0.0:8000
\`\`\`

The first run creates the Django application's tables in Supabase PostgreSQL and inserts a small sample catalog. The seed command is idempotent and does not overwrite matching SKUs.

### 3. Start the frontend

In another terminal, from the repository root:

\`\`\`bash
npm install
npm run dev
\`\`\`

Set DJANGO_API_URL to http://127.0.0.1:8000 in .env and open http://localhost:3000.

## Email and phone OTP setup

Customer login at /auth supports only one-time codes.

1. In Supabase Authentication → Providers, enable Email and Phone.
2. Configure an SMTP provider in Supabase Auth. Change the email template to show the numeric token using {{ .Token }} rather than only a magic link.
3. For TextBee SMS delivery, configure the Supabase Auth **Send SMS Hook** URL as https://YOUR-DJANGO-HOST/api/auth/send-sms-hook. Set the exact signing secret supplied by Supabase as SUPABASE_SEND_SMS_HOOK_SECRET on Django, plus TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID.
4. Add your production domain and local development URL in Supabase Auth's allowed redirect/site URL settings.
5. Test both email OTP and phone OTP on the deployed website. Actual delivery depends on valid SMTP/TextBee credentials, account limits and provider approval.

The Django SMS hook checks the signed webhook and timestamp before sending a message. Never expose the TextBee key or Supabase service-role key to browser code.

## Render deployment

render.yaml describes two services:

- **gwizineza-market:** Next.js website. Set DJANGO_API_URL to the Django service URL and configure the public Supabase URL and anon key.
- **gwizineza-django-api:** Django API. Configure Supabase PostgreSQL DATABASE_URL, Supabase URL/anon/service-role keys, DJANGO_SECRET_KEY, ADMIN_PASSWORD, SMS hook secret and TextBee credentials.

Deploy Django first, then confirm its /api/health endpoint returns a connected database response. A successful frontend build alone does not prove the database or OTP providers are connected.

## Existing data

This branch removes the code that read MongoDB/Prisma and does not automatically copy old MongoDB data. The seed command creates example products only. Export and import existing products, sellers, customers and orders into the new Supabase PostgreSQL tables before launch if you need to preserve them.

## Quality checks

GitHub Actions runs Django configuration/schema checks, the Figma route inventory, TypeScript, lint and the frontend production build. These checks do not replace live testing of Supabase credentials, OTP delivery, Storage uploads or checkout.
