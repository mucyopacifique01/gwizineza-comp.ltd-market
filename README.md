# Gwizineza Market

A Rwanda-focused e-commerce foundation for selling goods online. Customers can browse products, add items to a cart, provide delivery and TIN information when needed, pay online, receive an EBM receipt, and have the receipt sent to their WhatsApp number.

## Current foundation

- Next.js + React + TypeScript web storefront
- Responsive marketing and product catalog UI
- Checkout fields for WhatsApp/phone, TIN and delivery address
- Architecture prepared for server-side payment, EBM and WhatsApp integrations
- Future mobile app can use the same backend/API and database

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Next implementation phases

1. Product database, categories, inventory and cart persistence
2. Customer accounts and orders
3. Rwanda payment gateway integration with server-side verification
4. EBM/RRA integration and invoice storage
5. WhatsApp Business messaging for receipts
6. Admin dashboard
7. Mobile application using the shared API
8. Analytics, SEO, promotions and deep links

> Never put payment, EBM credentials, or WhatsApp secrets in frontend code. Keep credentials in server-side environment variables and verify payment webhooks before issuing an order receipt.
