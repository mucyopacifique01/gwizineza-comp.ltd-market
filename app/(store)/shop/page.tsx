import type { Metadata } from 'next';
import Link from 'next/link';
import { ensureStarterCatalog, getCategories, getProducts, getSellerOptions } from '@/lib/catalog';
import { SHOP_PAGE_SIZE } from '@/lib/config';
import type { SortKey } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { ShopSidebar, ShopToolbar } from '@/components/shop/ShopControls';
import { toQuery, type ShopParams } from '@/components/shop/types';
import { EmptyState } from '@/components/ui/States';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Shop', description: 'Browse every product on Gwizineza Market: groceries, household goods, beauty and more from approved sellers.' };

const SORTS: SortKey[] = ['featured', 'newest', 'price-asc', 'price-desc', 'name'];
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function ShopPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const sortRaw = str(searchParams.sort) as SortKey;
  const params: ShopParams = {
    q: str(searchParams.q).slice(0, 80),
    category: str(searchParams.category),
    seller: str(searchParams.seller),
    minPrice: str(searchParams.minPrice).replace(/\D/g, ''),
    maxPrice: str(searchParams.maxPrice).replace(/\D/g, ''),
    inStock: str(searchParams.inStock) === '1',
    sort: SORTS.includes(sortRaw) ? sortRaw : 'featured',
    view: str(searchParams.view) === 'list' ? 'list' : 'grid',
    page: Math.max(1, Number(str(searchParams.page)) || 1),
  };

  await ensureStarterCatalog();
  const [{ products, total }, categories, sellers] = await Promise.all([
    getProducts({
      q: params.q || null, category: params.category || null, seller: params.seller || null,
      minPrice: params.minPrice ? Number(params.minPrice) : null, maxPrice: params.maxPrice ? Number(params.maxPrice) : null,
      inStock: params.inStock, sort: params.sort as SortKey, page: params.page, pageSize: SHOP_PAGE_SIZE,
    }),
    getCategories(),
    getSellerOptions(),
  ]);

  const pages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const activeCategory = categories.find(c => c.slug === params.category);
  const activeSeller = sellers.find(s => s.id === params.seller);
  const title = params.q ? `Results for “${params.q}”` : activeCategory?.name ?? (activeSeller ? activeSeller.businessName : 'All products');
  const chips: { label: string; href: string }[] = [
    ...(params.q ? [{ label: `“${params.q}”`, href: toQuery({ ...params, q: '', page: 1 }) }] : []),
    ...(activeCategory ? [{ label: activeCategory.name, href: toQuery({ ...params, category: '', page: 1 }) }] : []),
    ...(activeSeller ? [{ label: activeSeller.businessName, href: toQuery({ ...params, seller: '', page: 1 }) }] : []),
    ...(params.minPrice || params.maxPrice ? [{ label: `${params.minPrice || 0} – ${params.maxPrice || '∞'} RWF`, href: toQuery({ ...params, minPrice: '', maxPrice: '', page: 1 }) }] : []),
    ...(params.inStock ? [{ label: 'In stock', href: toQuery({ ...params, inStock: false, page: 1 }) }] : []),
  ];

  return (
    <div className="container shop">
      <header className="shop-head">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14} /><span aria-current="page">Shop</span></nav>
        <h1>{title}</h1>
        <p className="muted">{total} product{total === 1 ? '' : 's'}{activeCategory || activeSeller || params.q ? ' found' : ' from approved sellers'}</p>
      </header>

      <div className="shop-layout">
        <ShopSidebar params={params} categories={categories} sellers={sellers} />
        <div className="shop-results">
          <ShopToolbar params={params} categories={categories} sellers={sellers} total={total} />
          {chips.length > 0 && (
            <div className="chip-cloud active-chips">
              {chips.map(c => <Link key={c.label} href={`/shop${c.href}`} className="chip chip-active" scroll={false}>{c.label}<Icon name="x" size={14} /></Link>)}
              <Link href="/shop" className="link-arrow small" scroll={false}>Clear all</Link>
            </div>
          )}

          {products.length === 0 ? (
            <EmptyState art="search" title={params.q ? 'No matches found' : 'Nothing here yet'} description={params.q ? `We couldn't find products for “${params.q}”. Try another word or remove a filter.` : 'No products match these filters right now.'}>
              <Link href="/shop" className="btn btn-primary">Reset filters</Link>
              <Link href="/categories" className="btn btn-outline">Browse categories</Link>
            </EmptyState>
          ) : (
            <div className={params.view === 'list' ? 'product-list' : 'product-grid product-grid-3'}>
              {products.map((p, i) => <ProductCard key={p.id} product={p} variant={params.view === 'list' ? 'list' : 'default'} priority={i < 3} />)}
            </div>
          )}

          {pages > 1 && (
            <nav className="pager" aria-label="Pagination">
              {params.page > 1 ? <Link className="btn btn-outline btn-sm" href={`/shop${toQuery({ ...params, page: params.page - 1 })}`}><Icon name="chevronLeft" size={16} /> Previous</Link> : <span />}
              <ol>
                {Array.from({ length: pages }, (_, i) => i + 1).filter(n => n === 1 || n === pages || Math.abs(n - params.page) <= 1).map((n, i, arr) => (
                  <li key={n}>
                    {i > 0 && n - arr[i - 1] > 1 && <span className="pager-gap">…</span>}
                    <Link href={`/shop${toQuery({ ...params, page: n })}`} aria-current={n === params.page ? 'page' : undefined} className={n === params.page ? 'is-current' : undefined}>{n}</Link>
                  </li>
                ))}
              </ol>
              {params.page < pages ? <Link className="btn btn-outline btn-sm" href={`/shop${toQuery({ ...params, page: params.page + 1 })}`}>Next <Icon name="chevronRight" size={16} /></Link> : <span />}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
