# Gwizineza Market

**Owner & Creator:** Mucyo Pacifique

A Rwanda-focused e-commerce platform for selling goods online. Customers can browse products, add items to a cart, provide delivery details, and place an order.

## Current foundation

- Next.js + React + TypeScript storefront
- PostgreSQL database with Prisma ORM
- Product catalog, categories and inventory
- Persistent cart
- Order creation and order status foundation
- Admin dashboard and multi-seller foundation
- Product image gallery support
- Future mobile app can use the same backend/API and database

## Run locally

### 1. Install prerequisites

Install Node.js and Docker Desktop.

### 2. Install dependencies

```bash
npm install
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

This starts a local PostgreSQL database named `gwizineza` on port `5432`.

### 4. Configure the database

Create a `.env` file in the project root using `.env.example` as the template. The local connection is:

```env
DATABASE_URL="postgresql://gwizineza:gwizineza_local_password@localhost:5432/gwizineza?schema=public"
```

Do not commit `.env` or real database credentials to GitHub.

### 5. Create the database tables

```bash
npx prisma db push
npx prisma generate
```

### 6. Load the product catalog

```bash
npm run db:seed
```

The seed contains the 15 current products and their RWF prices.

### 7. Start the website

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Database tools

Open Prisma Studio to inspect products, sellers, carts and orders:

```bash
npx prisma studio
```

Stop the local database with:

```bash
docker compose down
```

The database data remains in the Docker volume unless the volume is explicitly removed.
