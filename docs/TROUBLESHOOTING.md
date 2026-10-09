# Troubleshooting — Django, Supabase and OTP

## Products are not showing

1. Check that the Django service is deployed and that /api/health returns a connected database result.
2. In Render, confirm DATABASE_URL on Django is a PostgreSQL connection string from Supabase, not a MongoDB URL.
3. Confirm the frontend DJANGO_API_URL points to the live Django host.
4. Check Django logs for PostgreSQL authentication/network errors.
5. Ensure the initial schema has been created and seed_catalog has run:
   
   \`\`\`bash
   cd backend
   python manage.py check
   python manage.py migrate --run-syncdb --noinput
   python manage.py seed_catalog
   \`\`\`

## Email OTP not received

- Enable Email under Supabase Authentication providers.
- Configure SMTP in Supabase Auth and check provider logs/rate limits.
- Ensure the email template visibly renders the numeric OTP token with {{ .Token }}.
- Check the customer's spam folder and confirm the address.

## Phone OTP not received

- Enable Phone Auth in Supabase.
- Set the Supabase Auth Send SMS Hook URL to the Django URL ending in /api/auth/send-sms-hook.
- Use the exact Supabase webhook-signing secret in SUPABASE_SEND_SMS_HOOK_SECRET.
- Check TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID on Django and inspect provider logs.
- A stale or invalid webhook signature is intentionally rejected.

## Product image upload fails

- Confirm the Supabase product-images bucket exists.
- Ensure the server-only SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL are set on Django.
- Check bucket policy/public-read settings as required by the storefront.

## API errors

Browser /api requests are rewritten by Next middleware to Django. If frontend actions return a Django API configuration error, set DJANGO_API_URL on the frontend service and redeploy. Keep database/service-role/SMS-provider secrets out of browser code.

## Payments and receipts

A pending Payment row does not mean the customer was charged. MoMo/card provider integration is not configured in this branch. Order confirmation is not an official EBM receipt; confirm the approved RRA/EBM process before claiming fiscal compliance.
