import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routes = [
  ['Homepage', 'app/(store)/page.tsx'],
  ['Shop and search results', 'app/(store)/shop/page.tsx'],
  ['Product details', 'app/(store)/product/[slug]/page.tsx'],
  ['Cart', 'app/(store)/cart/page.tsx'],
  ['Checkout', 'app/(store)/checkout/page.tsx'],
  ['Login and registration', 'app/(store)/auth/page.tsx'],
  ['Customer account', 'app/(store)/account/page.tsx'],
  ['Order history', 'app/(store)/orders/page.tsx'],
  ['Wishlist', 'app/(store)/wishlist/page.tsx'],
  ['Deals and promotions', 'app/(store)/deals/page.tsx'],
  ['Trade assurance', 'app/(store)/trade-assurance/page.tsx'],
  ['Product comparison', 'app/(store)/compare/page.tsx'],
  ['Reviews and ratings', 'app/(store)/reviews/page.tsx'],
  ['About us', 'app/(store)/about/page.tsx'],
  ['Contact and support', 'app/(store)/contact/page.tsx'],
  ['Help center', 'app/(store)/help/page.tsx'],
  ['Shipping and logistics', 'app/(store)/shipping/page.tsx'],
  ['Blog and news', 'app/(store)/blog/page.tsx'],
  ['Seller storefront', 'app/(store)/sellers/[slug]/page.tsx'],
  ['Seller dashboard', 'app/seller/page.tsx'],
  ['Admin dashboard', 'app/admin/page.tsx'],
  ['User management', 'app/admin/customers/page.tsx'],
  ['Order management', 'app/admin/orders/page.tsx'],
  ['Product management', 'app/admin/products/page.tsx'],
  ['Seller management', 'app/admin/sellers/page.tsx'],
  ['Analytics', 'app/admin/analytics/page.tsx'],
  ['Finance', 'app/admin/finance/page.tsx'],
  ['CMS', 'app/admin/content/page.tsx'],
  ['Support tickets', 'app/admin/support/page.tsx'],
  ['Admin settings', 'app/admin/settings/page.tsx'],
];

const missing = [];
for (const [name, file] of routes) {
  try {
    await access(path.join(root, file), constants.R_OK);
  } catch {
    missing.push(`${name}: ${file}`);
  }
}

const responsiveCss = await readFile(path.join(root, 'styles/figma-47-completion.css'), 'utf8');
const responsiveChecks = [
  ['mobile breakpoint (519px)', /max-width:\s*519px/.test(responsiveCss)],
  ['tablet breakpoint (520–899px)', /min-width:\s*520px\)\s*and\s*\(max-width:\s*899px/.test(responsiveCss)],
  ['reduced-motion support', /prefers-reduced-motion/.test(responsiveCss)],
];

console.log(`Checking ${routes.length} functional Figma routes and responsive CSS…`);
if (missing.length || responsiveChecks.some(([, ok]) => !ok)) {
  if (missing.length) console.error('Missing functional routes:\n' + missing.map(x => `- ${x}`).join('\n'));
  for (const [name, ok] of responsiveChecks) if (!ok) console.error(`Missing responsive requirement: ${name}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: all ${routes.length} functional routes exist.`);
  console.log('PASS: mobile and tablet breakpoints are defined.');
  console.log('NOTE: route-file checks do not replace browser/E2E testing or a live deployment smoke test.');
}
