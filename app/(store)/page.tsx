import Link from 'next/link';
import { ensureStarterCatalog, getBestSellers, getCategories, getProducts, getPublicSellers, safeCatalog } from '@/lib/catalog';
import { composeHomepage } from '@/lib/merchandising';
import { Hero } from '@/components/home/Hero';
import { Spotlight } from '@/components/home/Spotlight';
import { Journey } from '@/components/home/Journey';
import { Carousel } from '@/components/home/Carousel';
import { CategoryTiles, groupByCategory } from '@/components/home/CategoryTiles';
import { BestSellers } from '@/components/home/BestSellers';
import { LocationBand } from '@/components/home/LocationBand';
import { SellerCard } from '@/components/seller/SellerCard';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/States';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // The catalog may be briefly unreachable (deploy, DB hiccup). Degrade to an
  // empty storefront instead of crashing the whole page to the error boundary.
  await safeCatalog('ensure-starter', undefined, ensureStarterCatalog);
  const [{ products }, best, categories, sellers] = await Promise.all([
    safeCatalog('products', { products: [], total: 0, page: 1, pageSize: 0 } as Awaited<ReturnType<typeof getProducts>>, () => getProducts({ sort: 'newest', pageSize: 60 })),
    safeCatalog('best-sellers', [] as Awaited<ReturnType<typeof getBestSellers>>, () => getBestSellers(6)),
    safeCatalog('categories', [] as Awaited<ReturnType<typeof getCategories>>, getCategories),
    safeCatalog('sellers', [] as Awaited<ReturnType<typeof getPublicSellers>>, getPublicSellers),
  ]);
  const home = composeHomepage(products, best);
  const cats = groupByCategory(categories, products);

  return (
    <>
      <Hero main={home.heroMain} secondary={home.heroSecondary} stats={{ products: products.length, sellers: sellers.length, categories: cats.length }} />

      {cats.length > 0 && (
        <section className="section-tight" aria-labelledby="cats-title">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">Shop by need</span><h2 id="cats-title">Categories</h2></div>
              <Link href="/categories" className="link-arrow">All categories <Icon name="arrowRight" size={16} /></Link>
            </div>
            <CategoryTiles items={cats} limit={5} />
          </div>
        </section>
      )}

      {home.spotlight.length > 0 && (
        <section className="section spotlight-section" aria-labelledby="spot-title">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">Spotlight</span><h2 id="spot-title">Picked for this week</h2></div>
              <p>Hand-picked by the Gwizineza team from our approved sellers.</p>
            </div>
            <Spotlight products={home.spotlight} />
          </div>
        </section>
      )}

      <section className="section-tight" aria-labelledby="new-title">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Fresh on the shelf</span><h2 id="new-title">New arrivals</h2></div>
            <Link href="/shop?sort=newest" className="link-arrow">See all <Icon name="arrowRight" size={16} /></Link>
          </div>
          {home.newArrivals.length ? (
            <Carousel label="New arrivals">
              {home.newArrivals.map(p => <div key={p.id} className="carousel-item"><ProductCard product={p} /></div>)}
            </Carousel>
          ) : (
            <EmptyState art="box" title="No products yet" description="Sellers are preparing their shelves. Check back very soon." />
          )}
        </div>
      </section>

      <Journey />

      <section className="section-tight" aria-labelledby="rec-title">
        <div className="container split">
          {home.bestSellers.length > 0 && (
            <div className="split-side">
              <span className="eyebrow">Most ordered</span>
              <h2 id="best-title" className="split-title">Best sellers</h2>
              <BestSellers products={home.bestSellers} />
            </div>
          )}
          <div className="split-main">
            <div className="section-head" style={{ marginBottom: 24 }}>
              <div><span className="eyebrow">For you</span><h2 id="rec-title">Recommended</h2></div>
              <Link href="/shop" className="link-arrow">Shop everything <Icon name="arrowRight" size={16} /></Link>
            </div>
            <div className={`product-grid${home.bestSellers.length ? ' product-grid-3' : ''}`}>
              {home.recommended.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </div>
      </section>

      {sellers.length > 0 && (
        <section className="section sellers-band" aria-labelledby="sellers-title">
          <div className="container">
            <div className="section-head">
              <div><span className="eyebrow">The people behind the products</span><h2 id="sellers-title">Our sellers</h2></div>
              <Link href="/sellers" className="link-arrow">Meet all sellers <Icon name="arrowRight" size={16} /></Link>
            </div>
            <div className="seller-grid">{sellers.slice(0, 3).map(s => <SellerCard key={s.id} seller={s} />)}</div>
          </div>
        </section>
      )}

      <LocationBand />
    </>
  );
}
