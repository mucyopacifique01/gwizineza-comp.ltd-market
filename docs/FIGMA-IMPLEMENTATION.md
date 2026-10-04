# Gwizineza Figma implementation map

Source: Gwizineza frontend Figma file zbM8kxiC8Xte8U1c4OGJoc.

The file contains 47 top-level screen frames. They represent 31 unique product/admin/seller screens plus 16 responsive variants (8 mobile + 8 tablet).

## Customer — 20 unique screens

1. Homepage — /
2. Shop — /shop
3. Product Details — /product/[slug]
4. Shopping Cart — /cart
5. Checkout — /checkout
6. Search Results — /shop?q=...
7. Login/Register — /auth
8. User Account — /account
9. Order History — /orders
10. Wishlist — /wishlist
11. Deals & Promotions — /deals
12. Trade Assurance — /trade-assurance
13. Product Comparison — /compare
14. Reviews & Ratings — /reviews
15. About Us — /about
16. Contact & Support — /contact
17. Help Center — /help
18. Shipping & Logistics — /shipping
19. Blog & News — /blog
20. Seller Storefront — /sellers/[slug] / seller discovery

## Seller — 1 unique screen

21. Seller Dashboard — /seller

## Owner/Admin — 10 unique screens

22. Admin Dashboard — /admin
23. User Management — /admin/customers
24. Order Management — /admin/orders
25. Product Management — /admin/products
26. Seller Management — /admin/sellers
27. Analytics — /admin/analytics
28. Finance — /admin/finance
29. CMS — /admin/content
30. Support Tickets — /admin/support
31. Admin Settings — /admin/settings

## Responsive variants — 16 frames

Mobile + tablet variants exist for Homepage, Shop, Product Details, Cart, Checkout, Search Results, Login/Register, and Order History.

The responsive variants are implemented through the same Next.js routes with breakpoint-specific CSS rather than duplicated routes.

## Figma implementation work

- Added the Figma dark B2B marketplace visual layer.
- Added Inter + Outfit typography.
- Added marketplace top utility bar, search/navigation, category navigation, and seller CTA.
- Added responsive dark marketplace styling.
- Added subtle 3D/perspective product motion to the homepage product stack.
- Added missing customer routes listed above.
- Added missing owner/admin routes listed above.
- Added Figma-inspired homepage sections: trending searches, flash deals, testimonials, new arrivals, industry solutions, RFQ, newsletter, rankings, and trade-assurance messaging.
- Preserved the existing Prisma/MongoDB, cart, checkout, seller, admin, and product APIs rather than replacing the backend with mock data.

## Verification status

Figma structure was inspected directly. The frontend changes were committed to GitHub.

A local next build, TypeScript check, browser visual regression, and production smoke test still need to run in an environment with the project's dependencies and deployment credentials. No payment, WhatsApp Business automation, or EBM integration is being claimed as active by this frontend work.