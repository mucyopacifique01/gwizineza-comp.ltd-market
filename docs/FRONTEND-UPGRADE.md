# Frontend inventory and backend integration

The Next.js/React frontend implements the Gwizineza Figma-screen inventory: 31 functional screens plus 16 responsive mobile/tablet variants. Every viewport shares the same API and data models.

Customer routes include Home, Shop, Product Details, Cart, Checkout, Search, OTP sign-in, Account, Orders, Wishlist, Deals, Trade Assurance, Compare, Reviews, About, Contact, Help, Shipping, Blog and Seller Storefront. Dashboard routes include Seller Dashboard and Admin Dashboard, User/Order/Product/Seller Management, Analytics, Finance, CMS, Support and Settings.

All browser /api requests are proxied to Django. Server-rendered catalog pages call Django through DJANGO_API_URL. Supabase Auth owns email/phone OTP identity; Supabase PostgreSQL stores marketplace business data; Supabase Storage stores product images.

A route being present or passing TypeScript is not proof that an external service is configured. Verify live database access, SMTP/SMS delivery, uploads and checkout after deployment.
