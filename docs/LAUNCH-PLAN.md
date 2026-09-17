# Gwizineza Market — Launch Plan

Owner & Creator: Mucyo Pacifique  
Primary location: Kabarondo, Rwanda  
Storefront language: English

## Confirmed product decisions

- Payment methods desired: Mobile Money and bank cards.
- Delivery: deliver orders to customers.
- EBM: provider/API details are not yet confirmed; do not issue or label a document as an official EBM invoice until the authorized integration and required business details are confirmed.
- WhatsApp: initially use a manual workflow. An authorized staff member may contact the customer through WhatsApp and send the appropriate receipt after validating the order/payment. Do not represent this as automated WhatsApp delivery.

## Existing application foundation

The current README describes a Next.js 14 / React / TypeScript application with Prisma + MongoDB, Supabase authentication and image storage, product/catalog APIs, persistent cart, checkout/order creation, order tracking, admin product/seller/gallery/order tools, and a Kabarondo location section. The current checkout is described as not collecting payment or tax information.

## Integration work — prerequisites

### Payments

Before implementing live payment collection, choose and onboard payment providers that support the merchant and the intended Rwanda transactions. Confirm:

- Merchant account approval and supported Mobile Money networks/card types.
- Provider API documentation, sandbox credentials, production credentials, webhook signing/verification method, and settlement/currency details.
- Whether checkout uses hosted payment pages or a server-side payment API.
- Refund/cancellation handling and payment status lifecycle.

Never collect or store raw card numbers/CVV in this application. Keep provider secrets server-side. Treat a payment as successful only after verifying the provider's server-side confirmation/webhook.

### Delivery

Delivery is confirmed as customer delivery, but operational details still need decisions:

- Serviceable areas (Kabarondo only or wider Rwanda).
- Delivery fee rules (fixed, by area/distance, or quoted manually).
- Whether customers choose a delivery time and whether cash-on-delivery is allowed.
- Required address fields and a customer contact phone number.
- Order statuses and who updates them.

### EBM and WhatsApp

- Confirm the business TIN/EBM setup and the authorized software/API route with the relevant provider/authority.
- Confirm what document is legally appropriate for each transaction and when it may be issued.
- For the initial manual WhatsApp workflow, decide the official business WhatsApp number and staff process. Avoid exposing customer data to unauthorized users.
- Automated WhatsApp messages later require an approved WhatsApp Business Platform/provider setup and customer opt-in where applicable.

## Safe implementation sequence

1. Verify the existing checkout, order schema, admin order tools, and environment variable setup before changing business logic.
2. Improve checkout validation and capture the confirmed delivery contact/address fields without pretending payment is completed.
3. Add provider-specific payment integration only after a provider and sandbox are selected; use server-side payment creation and verified webhooks.
4. Add admin-visible payment status and reconciliation.
5. Add delivery fee/area logic after the business rules are selected.
6. Add the manual WhatsApp handoff and only then consider approved automation.
7. Add EBM integration after the official route and required business details are confirmed.
8. Test end-to-end in sandbox and verify deployment environment variables before launch.

## Still to confirm with the owner

- Which Mobile Money/card payment provider(s) to use.
- Delivery areas and fee calculation.
- Business WhatsApp number and manual sender workflow.
- EBM/TIN setup and authorized integration provider.
- Whether cash on delivery is offered.
