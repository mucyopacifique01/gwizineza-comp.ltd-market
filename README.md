# Gwizineza Market

**Owner & Creator:** Mucyo Pacifique

Rwanda-focused e-commerce platform for selling goods online. Customers browse products, add items to a cart, provide delivery details, place orders, and track orders.

## Stack

- Next.js 14 + React + TypeScript
- Prisma ORM
- MongoDB Atlas
- Netlify for the web deployment
- Render configuration included for a separate Node service deployment when needed
- GitHub continuous deployment

## Implemented features

- Product catalog, categories, prices and stock
- Search and category filtering at `/shop`
- Persistent browser cart
- Customer checkout without payment/tax collection
- Order creation and customer order tracking at `/orders/<ORDER_NUMBER>`
- Admin login and signed admin session
- Protected seller, product, gallery and order APIs
- Admin product create/edit/archive and stock management at `/admin/products`
- Seller management and approval/suspension at `/admin`
- Product gallery management at `/admin`
- Admin order status management at `/admin/orders`
- Responsive storefront foundation
- Kabarondo, Rwanda location section
- Multi-seller foundation

Payment, TIN, EBM and WhatsApp receipt features are intentionally excluded from this version, as requested. They can be added later.

## MongoDB Atlas

Set `DATABASE_URL` to a MongoDB Atlas connection string. Prisma MongoDB uses `prisma db push` for schema synchronization.

```env
DATABASE_URL="mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/gwizineza?retryWrites=true&w=majority"
ADMIN_PASSWORD="your-private-admin-password"
ADMIN_SESSION_SECRET="a-long-random-secret"
```

Never commit real credentials to GitHub. Set these variables in the hosting provider instead.

## Local run

```bash
npm install
# create .env from .env.example and set DATABASE_URL + admin variables
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Netlify deployment

Netlify supports the Next.js App Router, route handlers, SSR and middleware with its current Next.js adapter. The repository contains `netlify.toml` with the production build configuration. citeturn0search0turn0search2

1. Connect this GitHub repository in Netlify.
2. Use the `main` branch for production.
3. Add `DATABASE_URL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` as Netlify environment variables.
4. Use `npm run build` as the build command if Netlify does not auto-detect it.
5. Deploy.

Netlify can automatically rebuild the site whenever changes are pushed to the connected Git repository. citeturn0search4turn0search13

## Render

`render.yaml` contains a Node web-service configuration. Add the same production environment variables in Render if you deploy the Node service there.

## Image storage

The current gallery accepts secure HTTP(S) image URLs, which works with Cloudinary, an object-storage CDN, or another image host. The `.env.example` includes optional Cloudinary variables for a future direct upload integration. No image-storage secret is committed to GitHub.

## Production checklist

Before launch:

- Create the MongoDB Atlas production cluster.
- Add `DATABASE_URL` to Netlify/Render.
- Set a strong `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.
- Run the seed once against the intended database if the initial catalog is required.
- Test product creation, stock changes, cart, checkout and order tracking.
- Confirm the admin login works.
- Add production product images.
- Connect a custom domain to Netlify when ready.

## Prisma commands

```bash
npm run db:generate
npm run db:push
npm run db:seed
npx prisma studio
```
