# Gwizineza Market — Rwanda Launch Plan

Owner: Mucyo Pacifique  
Business location: Kabarondo, Kayonza District, Rwanda  
Store language: English

This document records the confirmed operating choices and the remaining setup needed before accepting real payments.

## Confirmed decisions

- **Customer-facing language:** English.
- **Payment methods desired:** Mobile Money and card.
- **Delivery:** Deliver orders to customers.
- **Receipt handoff:** WhatsApp will initially be handled manually by a person.
- **EBM:** Not confirmed yet; do not claim that an order receipt is an official EBM invoice.

## Existing application foundation

The storefront currently loads products from `/api/products`, manages a cart through `/api/cart`, and submits orders through `/api/checkout`. The current checkout collects customer name, phone number, and delivery address. The homepage says no payment or tax information is requested at this stage.

## Required before enabling real payment collection

1. Choose and open merchant accounts with payment providers that support Rwanda and the intended Mobile Money networks and card payments.
2. Confirm provider fees, settlement currency, supported networks/cards, refund process, and merchant verification requirements.
3. Obtain sandbox credentials and provider documentation. Keep secrets only in deployment environment variables; never commit them.
4. Implement server-side payment initiation, provider callback/webhook signature verification, and reconciliation. Never mark an order paid based only on a browser redirect or customer screenshot.
5. Add explicit payment status values and an admin workflow for pending, paid, failed, refunded, and cancelled orders.
6. Test successful, failed, cancelled, duplicate, delayed, and refunded payment flows in sandbox before production.

## Delivery setup still needed

- Define delivery coverage (initially Kabarondo or wider Rwanda), delivery fees, estimated timelines, and how fees are calculated.
- Define how customers provide a usable location/contact and how staff confirm delivery.
- Add order statuses such as pending, confirmed, preparing, dispatched, delivered, and cancelled, with staff updates in the admin area.

## Manual WhatsApp process (initial phase)

- After an order is reviewed and its payment state is confirmed according to the chosen workflow, an authorized staff member may contact the customer using WhatsApp.
- Use a business-controlled phone and send only the order details needed for fulfillment.
- Do not send or label a document as an official EBM invoice unless the business has confirmed its EBM process and generated the valid document through that process.
- Keep a record in the admin workflow of whether the customer was contacted and whether the receipt/document was sent.

## EBM decision and compliance checkpoint

Before automating tax invoices, confirm the business's applicable RRA/EBM obligations and the approved device/software or integration path with a qualified local accountant or RRA. Determine what customer/tax data must be collected and what document is legally issued. Until then, keep EBM integration marked **not configured** and avoid implying compliance.

## Security and launch checks

- Protect admin and seller routes with server-side authentication and role checks.
- Validate and normalize customer inputs on the server; do not trust client-provided prices or payment status.
- Add privacy notice and explain how phone/address data is used and retained.
- Verify database backups, production environment variables, HTTPS, error logging, and recovery procedures.
- Run `npm run build` and end-to-end tests against a staging database before launch.

## Immediate next actions

1. Owner selects a Rwanda-capable payment provider (or providers) and obtains sandbox access.
2. Owner confirms delivery areas and pricing.
3. Owner confirms the EBM process with the appropriate local source.
4. Developer implements payment and order-state integration against the selected provider's official documentation, then tests it in sandbox.
