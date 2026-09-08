# Backend API

The application uses Next.js App Router Route Handlers for its HTTP backend and Prisma for database access. The product, cart, checkout and seller endpoints are server-side and can be shared with the future mobile app.

## Database setup

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install dependencies with `npm install`.
4. Run `npm run db:generate`.
5. Run the Prisma migrations with `npx prisma migrate dev`.
6. Run `npm run db:seed`.

## Store endpoints

- `GET /api/products` — active catalog; supports `q` and `category` filters and only exposes products belonging to approved sellers (plus existing marketplace products without a seller).
- `POST /api/products` — create a product and optionally attach it to an approved seller. Admin authorization must be added before production use.
- `GET /api/cart?cartId=...` — retrieve a cart and subtotal.
- `POST /api/cart` — create/update a cart item.
- `DELETE /api/cart` — remove a cart item.
- `POST /api/checkout` — creates an order and reserves stock.
- `GET /api/orders/:orderNumber` — retrieve an order by public order number.

## Admin seller management

- `GET /api/sellers` — list sellers and product counts.
- `POST /api/sellers` — create a seller from the admin dashboard.
- `PATCH /api/sellers` — approve, suspend, or reactivate a seller.
- `/admin` — admin seller-management dashboard.

Seller records include business name, owner name, phone, email, address and status (`PENDING`, `APPROVED`, `SUSPENDED`). Products can be linked to sellers, and order items retain the seller ID for future seller-level reporting and payouts.

## Security notes

- The current seller dashboard is a development foundation; it is not an authenticated admin system yet.
- Add authentication and role-based authorization before exposing `/admin`, `/api/sellers`, or product creation publicly.
- Do not expose `DATABASE_URL` or payment/EBM/WhatsApp credentials to browser code.
- Payment must be verified server-to-server before setting an order to `PAID`.
- EBM issuance and WhatsApp receipt delivery should happen after verified payment, ideally through idempotent server-side jobs/webhooks.
