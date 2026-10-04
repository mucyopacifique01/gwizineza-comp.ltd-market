import type { Metadata } from 'next';
import Link from 'next/link';
import { getProducts, safeCatalog } from '@/lib/catalog';
import { ProductCard } from '@/components/product/ProductCard';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Search results', description: 'Search products and suppliers on Gwizineza Market.' };

const str = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] ?? '' : v ?? '';

export default async function SearchPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const q = str(searchParams.q).trim().slice(0, 80);
  const result = await safeCatalog('search-page', { products: [], total: 0, page: 1, pageSize: 0 } as Awaited<ReturnType<typeof getProducts>>, () => getProducts({ q: q || null, sort: 'featured', pageSize: 24 }));
  return <div className="container fig-search-page">
    <section className="search-hero">
      <span className="eyebrow">Search results</span>
      <h1>{q ? <>Results for “{q}”</> : 'Find products and suppliers'}</h1>
      <p>{result.total} matching product{result.total === 1 ? '' : 's'} across the marketplace.</p>
      <form className="search-query" action="/search">
        <input className="input" name="q" defaultValue={q} placeholder="Search products, suppliers, and categories" aria-label="Search" />
        <button className="btn btn-primary" type="submit"><Icon name="search" size={17}/> Search</button>
      </form>
    </section>
    {result.products.length ? <div className="product-grid product-grid-4">{result.products.map(p => <ProductCard key={p.id} product={p}/>)}</div> : <div className="fig-empty"><Icon name="search" size={34}/><h3>No matches yet</h3><p>Try a broader search or browse the marketplace.</p><Link href="/shop" className="btn btn-primary">Browse products</Link></div>}
  </div>;
}
