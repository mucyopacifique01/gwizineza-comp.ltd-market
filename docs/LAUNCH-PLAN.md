# Gwizineza Market — launch plan

Owner & creator: Mucyo Pacifique  
Primary location: Kabarondo, Rwanda  
Storefront language: English

## Stack

Next.js/React is the frontend. Django runs the business API. Supabase PostgreSQL is the only application database. Supabase Auth provides email and phone OTP sign-in, and Supabase Storage stores images.

## Payment integration prerequisites

Before collecting live payments, choose providers that support the merchant and intended Rwanda transactions. Confirm merchant approval, fees, API/webhook docs, sandbox credentials, settlement/currency, refunds and cancellation process. Never collect or store raw card numbers/CVV. Mark an order paid only after verifying server-side provider confirmation.

Current Payment records are pending; mobile money/card providers are not configured yet.

## Delivery

Decide serviceable areas, delivery fee rules, delivery estimates, required address/contact fields, order status flow and the staff responsible for updates.

## EBM and WhatsApp

Confirm the business TIN/EBM setup and authorized software/API route with the relevant RRA/EBM provider or qualified accountant. Until then, do not label order confirmations as official tax invoices. Initial WhatsApp handoff may be manual by authorized staff. Automated messages require an approved WhatsApp Business provider and the appropriate customer opt-in.

## Safe rollout sequence

1. Configure Supabase PostgreSQL, Storage and credentials.
2. Configure email and SMS OTP providers, and test codes on production staging.
3. Deploy the Django service, then point the Next.js service to DJANGO_API_URL.
4. Test cart, checkout, seller isolation, admin tools, product images, order lookup and responsive mobile/tablet layouts.
5. Add a selected payment provider with verified webhooks and sandbox tests.
6. Define delivery-area fees and operational flow.
7. Add EBM only after its official path is confirmed.
