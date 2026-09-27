# Gwizineza Market: frontend upgrade notes

Owner & creator: **Mucyo Pacifique** · Kabarondo, Rwanda

## 1. What I found in the existing project

| Area | Finding |
|---|---|
| Stack | Next.js 14.2 (App Router), React 18, TypeScript, Prisma 6 + MongoDB, Supabase (Auth + Storage). **Tailwind is not installed**: styling was one plain `globals.css`. I kept plain CSS (no new dependencies) and built a proper design system with CSS custom properties. |
| Storefront | Home, `/shop`, `/orders/[orderNumber]`, `/auth` were single large client components with duplicated cart logic. |
| APIs | products, product-images, categories, cart, checkout, orders, sellers, seller auth/me/products, admin login/logout/orders/image-upload, Supabase SMS hook. |
| Auth | Admin: single password + HMAC-signed cookie. Seller: scrypt-hashed password + signed cookie. Customer: Supabase Auth (Google/email/phone OTP). |
| Seller isolation | `/api/seller/products` already scopes every read/write by the session seller id. Good. |

### Bugs & security issues fixed (backend, minimal changes)
1. **Seller password hashes were exposed.** `GET /api/products` (public) returned `seller: true`, which included `passwordHash`, `loginUsername` and phone for every seller. `GET /api/sellers` did the same for the admin UI. Both now use explicit safe `select`s.
2. **Auth failures returned 500.** `requireAdmin()` / `requireSeller()` throw a `Response`, but `apiErrorResponse` turned it into "Unexpected server error". It now passes the 401 through.
3. **Internal error messages leaked to clients** (e.g. DB connection hints). Errors are logged server-side; clients get friendly messages.
4. `admin/image-upload` read `SUPABASE_URL` only (the env example defines `NEXT_PUBLIC_SUPABASE_URL`), and its auth check sat outside `try`. Both fixed; the upload logic now lives in `lib/storage.ts`.
5. A **suspended seller with a still-valid cookie could keep editing** products (`PATCH /api/seller/products` didn't re-check status). Fixed.
6. The public product filter used `sellerId: null`, which on MongoDB doesn't match documents where the field was never set (e.g. starter products). Added `isSet: false`.

## 2. Schema changes (additive, all optional, no migration needed on MongoDB)
`Product`: `compareAtPriceRwf Int?`, `isFeatured Boolean?`, `displaySection String?` (`HERO_MAIN | HERO_SECONDARY | SPOTLIGHT | HOME_HIDDEN`), `displayPriority Int?`
`Order`: `customerEmail String?`

Run `npx prisma generate` (runs automatically on `npm install`). Existing documents stay valid.

## 3. API changes
Existing contracts are preserved (responses are supersets).

| Route | Change |
|---|---|
| `GET /api/products` | Safe seller fields. New optional params: `seller, minPrice, maxPrice, inStock=1, featured=1, sort, page, pageSize`. Adds `total/page/pageSize`. |
| `GET /api/products/[id]` | **New**: public product by id or slug. |
| `PATCH /api/products/[id]`, `POST /api/products` | Accept `compareAtPriceRwf`, `isFeatured`, `displaySection`, `displayPriority` (validated). |
| `GET/POST/PATCH /api/categories` | GET adds product counts. **New** admin POST (create) / PATCH (rename). |
| `GET /api/cart` | Product now includes seller name + category (for the cart UI). |
| `POST /api/checkout` | Same logic. Adds optional `customerEmail`, Rwandan phone validation. |
| `GET /api/admin/stats` | **New**: dashboard totals, 14-day sales, low stock, recent orders/products, seller activity. |
| `GET /api/admin/customers` | **New**: customers derived from orders (grouped by phone). |
| `GET /api/seller/orders` | **New**: only the seller's own line items + minimal order context (no customer phone). |
| `POST /api/seller/image-upload` | **New**: seller image upload (same Supabase bucket, server-side key). |
| `GET/POST/PATCH/DELETE /api/seller/product-images` | **New**: seller-scoped gallery (ownership checked on every call). |
| `middleware.ts` | Also redirects `/seller/*` to `/seller/login` when there's no session cookie (real auth stays in the APIs). |

## 4. Frontend architecture
```
app/
  layout.tsx                 fonts (Bricolage Grotesque + Manrope), global CSS
  (store)/                   storefront route group, URLs unchanged
    layout.tsx               header, footer, mobile tab bar, cart/wishlist/toast providers
    page.tsx                 homepage (server component, real data)
    shop/ categories/ sellers/ product/[slug]/ cart/ checkout/ orders/[orderNumber]/
    about/ contact/ help/ privacy/ terms/ auth/
    loading.tsx error.tsx not-found.tsx
  admin/                     owner console (layout + dashboard, orders, products, storefront, categories, sellers, customers, login)
  seller/                    seller console (layout + dashboard, products, orders, profile, login)
components/
  ui/        Button, Field, Badge, Modal/Sheet, Toast, Skeleton, States (empty/error), Icon
  brand/     Logo, motifs (hills contour + connecting thread)
  product/   ProductCard (default/compact/list), ImageStack (layered system), Gallery, BuyBox, QuickView, Price
  home/      Hero, Spotlight, Journey, Carousel, CategoryTiles, BestSellers, LocationBand
  layout/    SiteHeader, SearchOverlay, MobileTabBar, SiteFooter
  dash/      DashShell, ProductEditor, GalleryManager, StockEditor, SalesChart
lib/
  catalog.ts        server-only data layer shared by pages AND /api/products
  merchandising.ts  turns admin display settings into hero/spotlight slots (with fallbacks)
  types.ts, format.ts, config.ts, http.ts, use-api.ts, rwanda.ts, storage.ts
styles/  base.css (tokens + components) · store.css · dashboard.css
```

**Visual identity: "connected market".** A "G" mark drawn as a thread ending in a node; rolling-hill contour lines (land of a thousand hills); dashed "thread" connectors between journey steps; seller "node" dots on products; arched product windows. Sun-yellow / leaf-green / sky-blue are used only as accents.

**The layered ImageStack** (main product in front, up to three tucked behind) is used in the hero, category tiles, seller cards, product gallery peeks, the admin storefront preview and the gallery manager.

## 5. Honest gaps: backend needed for these
| Feature | Status | Needed |
|---|---|---|
| Online payment (MoMo/Airtel) | UI shows "Pay on delivery" (true: no payment is taken) and marks MoMo/Airtel "Coming soon" | Payment provider + verified webhook, plus `paymentStatus` on Order |
| EBM receipt | Receipt page shows "Order confirmation (not a tax invoice)". `NEXT_PUBLIC_EBM_ENABLED` switches the copy | A server route (e.g. `POST /api/orders/[n]/ebm`) calling a certified EBM/VSDC provider, plus `receiptStatus`/`ebmReceiptNo` fields |
| WhatsApp receipt | Click-to-chat links (`wa.me`) with a pre-filled receipt the customer sends themselves | For automatic sending: WhatsApp Business Cloud API route + template approval |
| Delivery fee | Server sets 0; UI says "arranged after order" | Server-side delivery rule before charging anything |
| Wishlist | Saved on the device (localStorage), labelled that way | Wishlist model + customer-auth API |
| Edit seller details / reset seller password | Not possible (no API) | `PATCH /api/sellers` for profile fields + password reset |
| Order privacy | `/orders/[orderNumber]` stays public as before (phone now masked in UI; the API still returns it) | Order access token or customer ownership check |
| Contact form | Opens WhatsApp/email with the message (nothing stored) | Contact-message API if you want messages saved |

## 6. What I verified vs. what YOU must run
Verified in my sandbox: all `.ts` files parse; every internal import resolves to a real export; every JSX component is imported or declared; no hooks or event handlers in server components; every icon name exists; every CSS class hook is defined.

**Not verified** (no npm/network in my environment, so I could not install dependencies): TypeScript type-check, `next build`, runtime against your MongoDB/Supabase, and visual checks in a browser. Please run:

```bash
npm install            # also runs prisma generate
npx tsc --noEmit
npm run lint
npm run build
npm run dev
```

### Manual test checklist
- [ ] Home shows real products; hero uses the product set as "Hero · main" in Admin → Storefront display
- [ ] Search overlay (click, `/`, or Ctrl/⌘+K): recent searches, categories, live results
- [ ] Shop: category/price/stock/seller filters, sort, grid/list, pagination; mobile filter sheet
- [ ] Product page: gallery zoom, thumbnails, qty, Add to cart, Buy now → checkout
- [ ] Cart: qty +/−, remove, totals, mobile sticky checkout bar
- [ ] Checkout: validation errors, out-of-stock message, order placed → `/orders/GW-…?placed=1`
- [ ] Receipt: WhatsApp share, print/PDF, copy order number, progress timeline
- [ ] Admin login → dashboard stats, orders status change, products (create/edit/upload/gallery/stock/archive), storefront controls, categories, sellers (create → approve → suspend), customers
- [ ] Seller login (approved only) → dashboard, products (only own), stock edits, gallery, orders, profile; suspended seller gets blocked
- [ ] Log in as seller A, try `PATCH /api/seller/products` with seller B's product id → must return 404
- [ ] `GET /api/products` response contains **no** `passwordHash` / `loginUsername`
