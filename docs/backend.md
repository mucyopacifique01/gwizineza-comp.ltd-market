# Backend architecture

The backend is Django under backend/. It uses Django ORM with Supabase PostgreSQL and receives browser requests through the Next.js /api proxy in middleware.ts.

Customer identity is handled by Supabase Auth. The frontend starts and verifies email/phone OTPs. Django validates the resulting access token using Supabase Auth. Marketplace data is stored in Supabase PostgreSQL rather than in Auth metadata.

Local checks:

\`\`\`bash
pip install -r backend/requirements.txt
cd backend
python manage.py check
python manage.py migrate --run-syncdb --noinput
python manage.py seed_catalog
\`\`\`

Set the Supabase PostgreSQL URL, Supabase Auth credentials, server-only storage key, Django secret, owner password and optional TextBee SMS-hook variables in Render. Never expose database, service-role, webhook-signing or TextBee keys to browser code.
