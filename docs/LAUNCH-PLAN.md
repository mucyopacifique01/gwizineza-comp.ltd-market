# Launch plan

## Current platform

Gwizineza Market is a responsive Next.js frontend with a Django backend and Supabase PostgreSQL as the only application database. Supabase Auth sends and verifies customer email/phone one-time codes; Supabase Storage keeps product images. The site supports product discovery, guest checkout, order tracking, admin seller/product/order management and seller dashboards.

## Before public launch

- Set and test Supabase PostgreSQL connection details on the Django service.
- Configure email SMTP plus a numeric OTP template in Supabase Auth.
- Configure the Supabase Auth SMS hook and TextBee credentials.
- Test owner and seller authorization, customer ownership checks, stock concurrency and product upload permissions.
- Configure a Rwanda delivery policy and actual delivery fees.
- Select supported Mobile Money/card providers, implement signed webhooks and test pending/paid/failed/refunded flows before accepting online payments.
- Confirm RRA/EBM requirements and a supported issuing path before describing any receipt as an official tax invoice.
- Decide how order confirmations will be sent to customers. Automated WhatsApp delivery requires WhatsApp Business API configuration; a manual chat link is not automation.

The demo seed creates sample catalog rows in Supabase PostgreSQL. Importing existing MongoDB data is a separate, deliberate migration task and is not performed automatically.
