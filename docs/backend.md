# Backend API

The application uses Next.js App Router Route Handlers for its HTTP backend and Prisma for database access. Next.js Route Handlers support GET/POST/DELETE and are defined under `app/api`. The product, cart and checkout endpoints are server-side and are designed to share the same API with the future mobile app.

## Database setup

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install dependencies with `npm install`.
4. Run `npm run db:generate`.
5. Run `npx prisma migrate dev --name init`.
6. Run `npm run db:seed`.

## Endpoints

- `GET /api/products` — active catalog; supports `q` and `category` filters.
- `POST /api/products` — create a product (admin authorization must be added before exposing this publicly).
- `GET /api/cart?cartId=...` — retrieve a cart and subtotal.
- `POST /api/cart` — create/update a cart item.
- `DELETE /api/cart` — remove a cart item.
- `POST /api/checkout` — atomically creates an order, reserves/decrements stock, copies product prices into order items, and clears the cart. The order remains `PENDING_PAYMENT` until a real payment provider callback verifies payment.
- `GET /api/orders/:orderNumber` — retrieve an order by public order number.

## Security notes

- Do not expose `DATABASE_URL` or payment/EBM/WhatsApp credentials to browser code.
- Add authentication/authorization to product creation before production use.
- Payment must be verified server-to-server before setting an order to `PAID`.
- EBM issuance and WhatsApp receipt delivery should happen after verified payment, ideally through idempotent server-side jobs/webhooks.
