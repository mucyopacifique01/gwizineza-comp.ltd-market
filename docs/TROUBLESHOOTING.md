# Troubleshooting

## Django API returns 503 / 502

- Confirm the frontend service has DJANGO_API_URL set to the public Django service URL.
- Open /api/health on the Django service and check the databaseStatus value.
- Confirm DATABASE_URL on the Django service is the Supabase PostgreSQL connection string. Use the Supabase Session Pooler when the hosting environment needs IPv4, and require SSL in production.
- Check the Django service logs for PostgreSQL authentication, network or schema synchronization errors.
- The frontend proxy reports 503 if DJANGO_API_URL is unset and 502 if Django cannot be reached.

## Supabase database/schema issue

- Make sure the database password and URI are URL-encoded correctly.
- Ensure the URL targets PostgreSQL, not a MongoDB connection string.
- Check that the Django service can connect to Supabase and that its startup command completed migrate --run-syncdb.
- To insert demonstration products, run python manage.py seed_marketplace from backend/.

## Email OTP not arriving

- Enable Email authentication in Supabase.
- Configure SMTP and an email template that renders the numeric token using the Supabase token template variable.
- Check the spam folder and Supabase Auth logs. Respect provider rate limits.

## Phone OTP not arriving

- Enable Phone authentication in Supabase Auth.
- Configure its Send SMS Hook to the Django endpoint /api/auth/send-sms-hook.
- Set SUPABASE_SEND_SMS_HOOK_SECRET, TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID when required on the Django service.
- Confirm the hook signing secret matches Supabase and the TextBee device/account can send messages. Test with a real phone number in international format.

## Image upload fails

- Check SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET on Django.
- Make sure the product-images bucket is available and the key belongs to the same project. Never put the service-role key in a NEXT_PUBLIC environment variable.

## Admin or seller login fails

- Confirm ADMIN_PASSWORD exists on Django for owner login.
- Seller accounts are created by the owner and need an active status, login username and password.
- Suspended sellers cannot use seller endpoints even with an old cookie.

## Payments, EBM or WhatsApp

Provider payment collection, official EBM invoicing and automated WhatsApp receipts are not automatically activated by the database migration. Verify the selected provider, credentials, signed webhooks and local compliance requirements before enabling them.
