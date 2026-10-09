# Store feature integration notes

All browser /api requests are routed to Django. Django owns marketplace business logic and persistence in Supabase PostgreSQL. The storefront and dashboards remain Next.js/React.

API domains include catalog, categories, sellers, cart, checkout/orders, customer profile/order history, wishlist, reviews, support, content, delivery zones, payments, admin settings/reporting and seller product/order endpoints.

The customer /auth UI uses email OTP or phone SMS OTP only. Phone delivery is configured through the Supabase Auth Send SMS Hook and TextBee; email delivery uses the Supabase Auth SMTP provider and an OTP-style email template.

Do not treat an order as paid because a Payment record exists. Do not describe an order confirmation as an official EBM receipt. Online payment providers, EBM integration and automated WhatsApp sending require separate provider setup and verified production flows.
