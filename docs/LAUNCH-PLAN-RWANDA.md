# Gwizineza Market — Rwanda launch plan

Owner: Mucyo Pacifique  
Business location: Kabarondo, Kayonza District, Rwanda  
Store language: English

## Architecture

- Next.js/React frontend using the 31 functional Figma screens and 16 responsive mobile/tablet variants.
- Django backend.
- Supabase PostgreSQL is the only application database.
- Supabase Auth email/phone OTP for customer sign-in.
- Supabase Storage for product images.
- TextBee SMS delivery through the signed Supabase Auth Send SMS Hook.

## Confirmed product choices

- Desired online payment options: Mobile Money and card.
- Delivery: orders are delivered to customers.
- Initial receipt/WhatsApp process can be manual.
- EBM setup must be confirmed; never label an order confirmation as an official EBM tax invoice before the authorized flow is in place.

## Before enabling real online payments

1. Choose and onboard payment providers that support the merchant and intended Rwanda transactions.
2. Confirm fees, settlement currency, supported networks/cards, refund handling and verification requirements.
3. Obtain sandbox credentials and provider documentation. Keep secrets in deployment variables only.
4. Implement server-side payment initiation, webhook signature verification and reconciliation. Never mark an order paid from a browser redirect or screenshot.
5. Test successful, failed, cancelled, duplicate, delayed and refunded transactions before production.
6. The current payment API records pending intents only; it does not activate MoMo/card payments.

## Delivery setup still needed

- Define delivery areas, fee rules and delivery estimates.
- Define customer address/contact collection and staff confirmation procedure.
- Keep status updates and delivery handoff controlled from the admin workflow.

## Manual WhatsApp and EBM process

An authorized staff member may manually contact the customer using the business-controlled WhatsApp number after reviewing the order. Send only the information needed to fulfill the order. For official tax documents, confirm applicable obligations and the authorized RRA/EBM device/software/integration process with RRA or a qualified local accountant.

## Technical launch checklist

- Set Supabase PostgreSQL DATABASE_URL on Django.
- Set frontend DJANGO_API_URL to the deployed Django service.
- Configure Supabase Auth email provider/SMTP and numeric OTP template.
- Configure Phone Auth Send SMS Hook, signature secret and TextBee.
- Validate server-side authorization, input validation, backups, HTTPS and recovery procedures.
- Run GitHub CI and smoke-test all major frontend/API flows after deployment.
