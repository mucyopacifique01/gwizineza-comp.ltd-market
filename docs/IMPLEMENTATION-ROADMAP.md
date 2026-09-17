# Gwizineza Market — Implementation Roadmap

Owner: Mucyo Pacifique  
Location: Kabarondo, Rwanda  
Language: English

This roadmap is based on the current `app/page.tsx` and `package.json` reviewed on 2026-09-17. It is a plan, not evidence that the features below are already implemented or tested.

## Existing foundation observed

- Next.js 14.2.35, React 18, TypeScript, Prisma 6 and Supabase client dependencies.
- Homepage fetches `/api/products` and `/api/cart`; checkout posts customer name, phone and delivery address to `/api/checkout`.
- Cart ID is currently stored in browser localStorage.
- Product cards show image, category, name, price, stock and Add to cart.
- Order confirmation shows order number, total and status.
- No payment/EBM data is currently requested by the homepage.

## Implementation sequence

### 1. Storefront discovery and conversion
- Add accessible product search, category filter, sort and empty/loading/error states.
- Improve responsive hero and product cards; support image fallback and multiple product images where the data model permits.
- Keep product content and prices sourced from the server, not hard-coded.

### 2. Cart and checkout
- Add quantity increment/decrement and remove controls, with server-side stock validation.
- Show subtotal, delivery fee and grand total before order submission.
- Validate name, Rwanda phone format and delivery address on both client and server.
- Prevent duplicate submissions and show a durable order confirmation/tracking reference.

### 3. Delivery and tracking
- Define delivery zones and fees as server-side configuration; do not guess final fees.
- Persist order status transitions and expose only a safe order lookup mechanism (e.g. order number plus verified phone/unguessable token).
- Record status timestamps and make admin updates auditable.

### 4. Admin and seller access
- Inspect existing auth and Prisma schema before implementation.
- Enforce authorization in every protected API route/server action, not only by hiding UI.
- Admin can create/disable sellers and assign ownership; sellers can access only their own products and orders.
- Validate all mutations server-side and log sensitive administrative actions.

### 5. WhatsApp order message
- Provide a user-initiated `wa.me` link with URL-encoded order number, total, delivery summary and support contact only after the order is created.
- Do not claim a message was sent; ordinary WhatsApp requires the customer/person to press Send.
- Do not put secrets or unnecessary personal data in the link.

### 6. Security, tests and deployment
- Audit dependencies and update Next.js/React to a currently patched compatible release before production; verify compatibility and lockfile.
- Add automated checks for lint, typecheck, build and key API flows; test authorization boundaries and stock/checkout race cases.
- Keep secrets in deployment environment variables; never commit `.env` files.
- Use a staging deployment and test database before production; verify backups, HTTPS, logging and rollback.

## Current blockers / decisions needed

- Confirm delivery fee/zones and support WhatsApp number.
- Inspect current Prisma schema and auth/API implementations before changing data structures or permissions.
- Payment provider integration remains separate and requires a Rwanda-supported provider plus sandbox credentials; this roadmap does not activate payments.
- EBM remains unconfigured pending confirmation of requirements and integration path.

## Acceptance checklist

- Search/category filters work together and remain usable on mobile.
- Cart quantity and totals match server-calculated values.
- Checkout rejects invalid data and unavailable stock; repeated submits do not create duplicate orders.
- Delivery fee is visible before order placement and is stored with the order.
- A customer can safely retrieve order status without exposing other customers' orders.
- Seller A cannot read or mutate Seller B's products/orders; non-admin cannot manage sellers.
- WhatsApp link opens a prefilled message, with sending left to the user.
- CI passes lint, typecheck, tests and production build; staging smoke test passes.
