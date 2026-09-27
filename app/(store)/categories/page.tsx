import type { Metadata } from 'next';
import { ensureStarterCatalog, getCategories, getProducts, safeCatalog } from '@/lib/catalog';
import { CategoryTiles, groupByCategory } from '@/components/home/CategoryTiles';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  // Degrade to an empty result instead of crashing the page if the database is briefly unreachable.
  await safeCatalog('ensure-starter', undefined, ensureStarterCatalog);
  const [categories, { products }] = await Promise.all([
    safeCatalog('categories', [] as Awaited<ReturnType<typeof getCategories>>, getCategories),
    safeCatalog('products', { products: [], total: 0, page: 1, pageSize: 0 } as Awaited<ReturnType<typeof getProducts>>, () => getProducts({ pageSize: 60, sort: 'featured' })),
  ]);
  const items = groupByCategory(categories, products);
  return (
    <div className="container section-tight">
      <header className="page-head">
        <span className="eyebrow">Browse</span>
        <h1>Shop by category</h1>
        <p className="muted">Every aisle of the market, one tap away.</p>
      </header>
      {items.length ? <CategoryTiles items={items} /> : (
        <EmptyState art="box" title="No categories yet" description="Categories appear once products are published."><ButtonLink href="/shop">View all products</ButtonLink></EmptyState>
      )}
    </div>
  );
}
