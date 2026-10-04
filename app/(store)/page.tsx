import Link from 'next/link';
import { ensureStarterCatalog, getBestSellers, getCategories, getProducts, getPublicSellers, safeCatalog } from '@/lib/catalog';
import { composeHomepage } from '@/lib/merchandising';
import { Hero } from '@/components/home/Hero';
import { Spotlight } from '@/components/home/Spotlight';
import { FigmaHomeSections } from '@/components/home/FigmaSections';
import { LocationBand } from '@/components/home/LocationBand';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await safeCatalog('ensure-starter', undefined, ensureStarterCatalog);
  const [{ products }, best, categories, sellers] = await Promise.all([
    safeCatalog('products', { products: [], total: 0, page: 1, pageSize: 0 } as Awaited<ReturnType<typeof getProducts>>, () => getProducts({ sort: 'newest', pageSize: 60 })),
    safeCatalog('best-sellers', [] as Awaited<ReturnType<typeof getBestSellers>>, () => getBestSellers(6)),
    safeCatalog('categories', [] as Awaited<ReturnType<typeof getCategories>>, getCategories),
    safeCatalog('sellers', [] as Awaited<ReturnType<typeof getPublicSellers>>, getPublicSellers),
  ]);
  const home = composeHomepage(products, best);

  return <>
    <Hero main={home.heroMain} secondary={home.heroSecondary} stats={{ products: products.length, sellers: sellers.length, categories: categories.length }} />
    <FigmaHomeSections products={products} best={best} categories={categories} />

    {home.spotlight.length > 0 && (
      <section className="section spotlight-section">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow">Marketplace spotlight</span><h2>Picked for this week</h2></div><Link href="/shop" className="link-arrow">Browse all <Icon name="arrowRight" size={16}/></Link></div>
          <Spotlight products={home.spotlight}/>
        </div>
      </section>
    )}

    <LocationBand />
  </>;
}
