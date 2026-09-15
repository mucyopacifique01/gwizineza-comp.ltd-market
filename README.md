# Gwizineza Market

**Owner & Creator:** Mucyo Pacifique

Rwanda-focused e-commerce platform for selling goods online. Customers browse products, add items to a cart, provide delivery details, place orders, and track orders.

## Stack

- Next.js 14 + React + TypeScript
- Prisma ORM
- MongoDB Atlas
- Supabase Storage for product images
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
- Admin product image upload directly to Supabase Storage
- Seller management and approval/suspension at `/admin`
- Product gallery management at `/admin`
- Admin order status management at `/admin/orders`
- Responsive storefront foundation
- Kabarondo, Rwanda location section
- Multi-seller foundation

Payment, TIN, EBM and WhatsApp receipt features are intentionally excluded from this version, as requested. They can be added later.

## MongoDB Atlas

Set `DATABASE_URL` to a MongoDB Atlas connection string. Prisma MongoDB uses `prisma db push` for schema synchronization.

## Supabase Storage

Create a Supabase project and create a Storage bucket named `product-images`. The admin upload endpoint uses the server-side Supabase service-role key, so that key must never be exposed in browser code or committed to GitHub.

Set these environment variables in the hosting provider and in local development:

```env
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_STORAGE_BUCKET="product-images"
```

The product-image URLs are public Storage URLs, so the `product-images` bucket should be configured for public reads if the storefront needs to display them directly.

## Local run

```bash
npm install
# create .env from .env.example and set DATABASE_URL + admin variables + Supabase variables
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Netlify deployment

1. Connect this GitHub repository in Netlify.
2. Use the `main` branch for production.
3. Add `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` as Netlify environment variables.
4. Use `npm run build` as the build command if Netlify does not auto-detect it.
5. Deploy.

## Render

`render.yaml` contains a Node web-service configuration. Add the same production environment variables in Render if you deploy the Node service there.

## Image storage

Product images are no longer configured for Cloudinary. The admin product form can upload an image directly to Supabase Storage and then save the returned public URL on the product. Pasting an existing HTTP(S) image URL is also supported.

## Production checklist

Before launch:

- Create the MongoDB Atlas production cluster.
- Create the Supabase `product-images` Storage bucket.
- Add `DATABASE_URL`, admin variables, and Supabase variables to Netlify/Render.
- Set a strong `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.
- Run the seed once against the intended database if the initial catalog is required.
- Test product creation, image upload, stock changes, cart, checkout and order tracking.
- Confirm the admin login works.
- Connect a custom domain to Netlify when ready.

## Prisma commands

```bash
npm run db:generate
npm run db:push
npm run db:seed
npx prisma studio
```
