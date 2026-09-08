# Gwizineza Market

**Owner & Creator:** Mucyo Pacifique

A Rwanda-focused e-commerce platform for selling goods online. Customers can browse products, add items to a cart, provide delivery and TIN information when needed, pay online, receive an EBM receipt, and have the receipt sent to their WhatsApp number.

## Project ownership

This project is created and owned by **Mucyo Pacifique**.

## Current foundation

- Next.js + React + TypeScript web storefront
- Responsive marketing and product catalog UI
- Checkout fields for WhatsApp/phone, TIN and delivery address
- Product database, categories, inventory and cart persistence
- Order creation and order status foundation
- Architecture prepared for server-side payment, EBM and WhatsApp integrations
- Future mobile app can use the same backend/API and database

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Next implementation phases

1. Customer accounts and orders
2. Rwanda payment gateway integration with server-side verification
3. EBM/RRA integration and invoice storage
4. WhatsApp Business messaging for receipts
5. Admin dashboard
6. Mobile application using the shared API
7. Analytics, SEO, promotions and deep links

> Never put payment, EBM credentials, or WhatsApp secrets in frontend code. Keep credentials in server-side environment variables and verify payment webhooks before issuing an order receipt.
