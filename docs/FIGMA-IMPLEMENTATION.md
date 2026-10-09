# Figma screen implementation

The frontend is retained as a responsive Next.js application built around the supplied Gwizineza Figma designs. The inventory is 31 functional screens plus responsive variants, not 47 separate backend systems.

Customer screens include home, shop, product details, cart, checkout, search, OTP account, account/order history, wishlist, deals, trade assurance, comparison, reviews, about/contact/help, shipping/logistics, blog/news and seller storefront. Owner screens cover dashboard, users/customers, orders, products, sellers, analytics, finance, CMS, support and settings. Seller screens cover the seller dashboard, catalog, stock and orders. Desktop/tablet/mobile variants share the same Django API.

## Data architecture

- Next.js /api catch-all is a same-origin proxy to the Django API.
- Django owns request validation, role checks, catalog, cart, checkout and order behavior.
- Supabase PostgreSQL is the only application database.
- Supabase Auth handles customer email and phone OTP.
- Supabase Storage handles product images.

MongoDB and Prisma have been removed from runtime/dependencies. Figma layouts are design references; they do not mean payment provider, EBM or WhatsApp automation credentials have been configured.
