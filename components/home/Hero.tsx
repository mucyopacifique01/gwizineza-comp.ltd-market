import Link from 'next/link';
import type { ProductDTO } from '@/lib/types';
import { primaryImage } from '@/lib/merchandising';
import { ImageStack } from '@/components/product/ImageStack';
import { Price } from '@/components/product/Price';
import { Hills, Thread } from '@/components/brand/Motifs';
import { Icon } from '@/components/ui/Icon';

export function Hero({ main, secondary, stats }: { main: ProductDTO | null; secondary: ProductDTO[]; stats: { products: number; sellers: number; categories: number } }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <Hills className="hero-hills" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow reveal">Kabarondo · Rwanda · Online</span>
          <h1 id="hero-title" className="hero-title reveal reveal-1">
            Local goods,<br /><span className="hero-accent">connected</span> to your door.
          </h1>
          <p className="hero-lead reveal reveal-2">
            Gwizineza Market links trusted sellers with everyday shoppers. Choose what you need, order in minutes, and keep a clear confirmation you can share on WhatsApp.
          </p>
          <div className="hero-ctas reveal reveal-3">
            <Link href="/shop" className="btn btn-primary btn-lg">Start shopping <Icon name="arrowRight" size={18} /></Link>
            <Link href="/categories" className="btn btn-outline btn-lg">Explore categories</Link>
          </div>
          <ul className="hero-trust reveal reveal-4" aria-label="Why shop with us">
            <li><span className="trust-ico"><Icon name="shield" size={18} /></span><span><strong>Approved sellers</strong><small>Every seller is verified by the owner</small></span></li>
            <li><span className="trust-ico"><Icon name="receipt" size={18} /></span><span><strong>Clear confirmation</strong><small>Order number, items and totals</small></span></li>
            <li><span className="trust-ico"><Icon name="truck" size={18} /></span><span><strong>Local delivery</strong><small>Dispatched from Kabarondo</small></span></li>
          </ul>
        </div>

        <div className="hero-visual" aria-label={main ? `Featured: ${main.name}` : 'Featured products'}>
          <Thread className="hero-thread" />
          {main ? (
            <>
              <ImageStack
                size="hero"
                priority
                main={{ key: main.id, src: primaryImage(main), alt: main.name }}
                behind={secondary.map(p => ({ key: p.id, src: primaryImage(p), alt: p.name }))}
              />
              <Link href={`/product/${main.slug}`} className="float-card float-product">
                <span className="float-kicker">Featured today</span>
                <strong>{main.name}</strong>
                <Price value={main.priceRwf} compareAt={main.compareAtPriceRwf} size="sm" />
              </Link>
              <div className="float-card float-seller" aria-hidden="true">
                <span className="pulse-dot" />
                <span><small>Sold by</small><strong>{main.seller?.businessName ?? 'Gwizineza Market'}</strong></span>
              </div>
              <div className="float-card float-stats" aria-hidden="true">
                <strong>{stats.products}+</strong><small>products</small>
                <span className="float-sep" />
                <strong>{Math.max(stats.sellers, 1)}</strong><small>seller{stats.sellers === 1 ? '' : 's'}</small>
              </div>
              <div className="float-card float-wa" aria-hidden="true"><Icon name="whatsapp" size={18} /> Share receipt on WhatsApp</div>
            </>
          ) : (
            <div className="hero-empty"><Icon name="box" size={40} /><p>Products will appear here as soon as sellers publish them.</p></div>
          )}
        </div>
      </div>
    </section>
  );
}
