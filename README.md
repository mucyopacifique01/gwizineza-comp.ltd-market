# Gwizineza Market

**Owner & Creator:** Mucyo Pacifique

A Rwanda-focused e-commerce platform for selling goods online. Customers can browse products, add items to a cart, provide delivery details, and place an order.

## Current foundation

- Next.js + React + TypeScript storefront and API
- MongoDB database with Prisma ORM
- Product catalog, categories and inventory
- Persistent cart
- Order creation and order status foundation
- Admin dashboard and multi-seller foundation
- Product image gallery support
- Ready for Vercel or Render deployment
- Future mobile app can use the same backend/API and database

## Database: MongoDB Atlas

The project now uses MongoDB instead of PostgreSQL. For production, use MongoDB Atlas and copy its connection string into `DATABASE_URL`.

Example:

```env
DATABASE_URL="mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/gwizineza?retryWrites=true&w=majority"
```

Keep database credentials in your hosting provider's environment variables. Do not commit `.env` or real credentials to GitHub.

MongoDB does not use Prisma relational migrations, so schema changes are applied with `prisma db push`.

## Run locally

### 1. Install Node.js

Install a current supported Node.js LTS release.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure MongoDB

Create a `.env` file in the project root using `.env.example` as the template and set `DATABASE_URL` to your MongoDB Atlas connection string.

### 4. Create MongoDB collections/indexes

```bash
npm run db:push
```

### 5. Load the product catalog

```bash
npm run db:seed
```

The seed contains the 15 current products and their RWF prices. Products for which stock has not yet been provided remain at stock `0` so they cannot be ordered accidentally.

### 6. Start the website

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Production deployment

### Vercel

1. Import this GitHub repository into Vercel.
2. Keep the framework as Next.js and use the default build settings.
3. Add `DATABASE_URL` in the Vercel project Environment Variables.
4. Deploy.

The `postinstall` script generates Prisma Client during the Vercel install/build process.

### Render

A `render.yaml` file is included. Create a Render Web Service from this repository and use the Blueprint configuration, or use:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Environment variable: `DATABASE_URL` = your MongoDB Atlas connection string

Render can automatically redeploy when changes are pushed to the connected GitHub branch.

## Prisma tools

Generate Prisma Client:

```bash
npm run db:generate
```

Sync the Prisma schema to MongoDB:

```bash
npm run db:push
```

Open Prisma Studio:

```bash
npx prisma studio
```

## Important production note

The current project still needs proper admin authentication/authorization before exposing seller and product-management endpoints publicly. Database credentials should remain server-side and must never be placed in client-side environment variables such as `NEXT_PUBLIC_*`.
