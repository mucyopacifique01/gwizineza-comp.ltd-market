import Link from 'next/link';
import type { ProductDTO } from '@/lib/types';
import { primaryImage } from '@/lib/merchandising';
import { ImageStack } from '@/components/product/ImageStack';
import { Price } from '@/components/product/Price';
import { Icon } from '@/components/ui/Icon';

export function Hero({ main, secondary, stats }: { main: ProductDTO | null; secondary: ProductDTO[]; stats: { products: number; sellers: number; categories: number } }) {
  return <section className="hero" aria-labelledby="hero-title">
    <div className="container hero-grid">
      <div className="hero-copy">
        <span className="eyebrow reveal">GLOBAL PROMOTION</span>
        <h1 id="hero-title" className="hero-title reveal reveal-1">Source millions of products from <span>verified suppliers worldwide</span></h1>
        <p className="hero-lead reveal reveal-2">Compare prices, review supplier ratings, and place orders with Trade Assurance protection across electronics, apparel, machinery, home goods, and more.</p>
        <div className="hero-ctas reveal reveal-3"><Link href="/shop" className="btn btn-primary btn-lg">Shop Now <Icon name="arrowRight" size={18}/></Link><Link href="/categories" className="btn btn-outline btn-lg">Explore Products</Link></div>
        <div className="hero-stats reveal reveal-4"><span><strong>{stats.products}+</strong> products</span><span><strong>{Math.max(stats.sellers,1)}</strong> sellers</span><span><strong>{Math.max(stats.categories,1)}</strong> categories</span></div>
      </div>
      <div className="hero-visual" aria-label="Featured marketplace products">
        {main ? <div className="fig-hero-stack">
          <div className="fig-hero-product fig-hero-back">{secondary[0] && <><img src={primaryImage(secondary[0])} alt={secondary[0].name}/><span>{secondary[0].name}</span></>}</div>
          <div className="fig-hero-product fig-hero-left">{secondary[1] && <><img src={primaryImage(secondary[1])} alt={secondary[1].name}/><span>{secondary[1].name}</span></>}</div>
          <div className="fig-hero-product fig-hero-main"><img src={primaryImage(main)} alt={main.name}/><span>{main.name}</span><Price value={main.priceRwf} size="sm"/></div>
        </div> : <div className="hero-empty"><Icon name="box" size={40}/><p>Products will appear here as sellers publish them.</p></div>}
      </div>
    </div>
  </section>;
}