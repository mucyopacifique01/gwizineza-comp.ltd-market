import type { Metadata } from 'next';
import { ensureStarterCatalog, getCategories, getProducts } from '@/lib/catalog';
import { CategoryTiles, groupByCategory } from '@/components/home/CategoryTiles';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Categories' };

export default async function CategoriesPage() {
  await ensureStarterCatalog();
  const [categories, { products }] = await Promise.all([getCategories(), getProducts({ pageSize: 60, sort: 'featured' })]);
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
