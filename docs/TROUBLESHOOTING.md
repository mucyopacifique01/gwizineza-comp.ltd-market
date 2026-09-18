# Troubleshooting: Products Not Showing / Database Connection Errors

This guide collects everything diagnosed while debugging the "products are invisible"
issue (buttons disabled, empty product grid, 503 API errors). Last verified: 2026-09-18.

## Symptom

The storefront loads but shows no products, and cart buttons stay disabled.
The API endpoints return 503 with:

```json
{"error":"Database connection failed. Check that DATABASE_URL is set correctly and that MongoDB Atlas allows connections from this server (Network Access / IP Access List)."}
```

This error is raised by `lib/api-errors.ts` when Prisma cannot reach MongoDB at all.
It happens **before any product data is read**, so the data itself is never the cause
while this message is visible.

## Root cause checklist (in order)

1. **MongoDB Atlas Network Access** — Render (free plan) uses dynamic IPs, so Atlas
   must allow connections from anywhere:
   - Atlas → Network Access → Add IP Address → `0.0.0.0/0` (Allow access from anywhere).

2. **Atlas cluster paused** — free M0 clusters pause after inactivity.
   - Atlas → check the cluster shows **Active**; if paused, click **Resume**.

3. **DATABASE_URL in Render** — Render → your service → Environment:
   - Must be present (it is marked `sync: false` in `render.yaml`, so Render never
     auto-fills it; it must be pasted manually).
   - Must include the database name `/gwizineza` and have **no quotes or extra
     characters**:
     ```text
     mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/gwizineza?retryWrites=true&w=majority
     ```
   - Missing `/gwizineza` causes Prisma error `P1013` (database name invalid).

4. **Redeploy after fixing** — Render → Manual Deploy → Deploy latest commit.
   Render only re-reads environment variables on a new deploy.

## How the database fills itself

Once the connection works, no manual seeding is needed:

- `prisma db push` runs as part of the deploy (see `package.json` start/build flow)
  and creates all collections and validators.
- On the first successful request to the storefront/admin API, the app runs
  `ensureStarterCatalog()` in `app/api/products/route.ts`, which inserts the
  starter categories and products automatically.

## Verifying

```bash
curl https://<your-render-url>/api/products   # should return {"products":[...]}
curl https://<your-render-url>/api/categories # should return {"categories":[...]}
```

Both must return JSON data (not an error) before the storefront can show products.

## Local development notes

- Prisma requires MongoDB to run as a **replica set** even for single upserts
  (error `P2031`). Atlas is always a replica set, so this only affects local dev.
- Quick local replica set for testing:
  ```js
  // node script using mongodb-memory-server-core
  const { MongoMemoryReplSet } = require('mongodb-memory-server-core');
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  // use rs.getUri() as DATABASE_URL
  ```
- Then: `DATABASE_URL="mongodb://127.0.0.1:PORT/gwizineza?replicaSet=testset&directConnection=true" npx prisma db push`

## Related docs

- [Launch plan](LAUNCH-PLAN.md)
- [Implementation roadmap](IMPLEMENTATION-ROADMAP.md)
- [Store features implementation](STORE-FEATURES-IMPLEMENTATION.md)
