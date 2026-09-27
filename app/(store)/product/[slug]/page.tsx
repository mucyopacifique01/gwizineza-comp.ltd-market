import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '@/lib/catalog';
import { primaryImage } from '@/lib/merchandising';
import { discountPercent, formatRwf, initials } from '@/lib/format';
import { site } from '@/lib/config';
import { ProductGallery } from '@/components/product/ProductGallery';
import { BuyBox } from '@/components/product/BuyBox';
import { Price, StockPill } from '@/components/product/Price';
import { ProductCard } from '@/components/product/ProductCard';
import { Carousel } from '@/components/home/Carousel';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug).catch(() => null);
  if (!product) return { title: 'Product not found' };
  const image = primaryImage(product);
  return {
    title: product.name,
    description: product.description?.slice(0, 160) ?? `${product.name} for ${formatRwf(product.priceRwf)} on Gwizineza Market.`,
    openGraph: image && /^https?:/.test(image) ? { images: [image] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product, 10);
  const off = discountPercent(product.priceRwf, product.compareAtPriceRwf);
  const images = product.images.length ? product.images.map(i => ({ src: i.url, alt: i.altText ?? product.name })) : [{ src: primaryImage(product), alt: product.name }];
  const sellerName = product.seller?.businessName ?? 'Gwizineza Market';

  return (
    <>
      <div className="container pdp">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><Icon name="chevronRight" size={14} />
          <Link href="/shop">Shop</Link><Icon name="chevronRight" size={14} />
          {product.category && <><Link href={`/shop?category=${product.category.slug}`}>{product.category.name}</Link><Icon name="chevronRight" size={14} /></>}
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="pdp-grid">
          <ProductGallery images={images} name={product.name} />

          <div className="pdp-info">
            <div className="row wrap">
              {product.category && <Link href={`/shop?category=${product.category.slug}`} className="badge">{product.category.name}</Link>}
              {off > 0 && <span className="badge badge-clay">Save {off}%</span>}
              <StockPill stock={product.stock} />
            </div>
            <h1 className="pdp-title">{product.name}</h1>
            <Link href={product.seller ? `/shop?seller=${product.seller.id}` : '/shop'} className="pdp-seller"><span className="node" aria-hidden="true" /> Sold by <strong>{sellerName}</strong></Link>
            <Price value={product.priceRwf} compareAt={product.compareAtPriceRwf} size="xl" />
            {product.stock > 0 && product.stock <= 5 && <p className="alert alert-warn"><Icon name="clock" size={16} /> Only {product.stock} left. Order soon.</p>}

            <BuyBox product={product} />

            <ul className="pdp-assure">
              <li><Icon name="truck" size={20} /><span><strong>Delivery from Kabarondo</strong><small>We call you to arrange delivery after you order.</small></span></li>
              <li><Icon name="receipt" size={20} /><span><strong>Order confirmation</strong><small>Instant order number. Print or share it on WhatsApp.</small></span></li>
              <li><Icon name="shield" size={20} /><span><strong>Approved seller</strong><small>Every seller is verified by Gwizineza Market.</small></span></li>
            </ul>
          </div>
        </div>

        <div className="pdp-details">
          <section className="card card-flat">
            <h2 className="card-title">About this product</h2>
            {product.description ? <p className="pdp-desc">{product.description}</p> : <p className="muted">The seller hasn’t added a description yet. Contact us if you have questions about this product.</p>}
          </section>
          <section className="card card-flat">
            <h2 className="card-title">Product information</h2>
            <dl className="spec">
              <div><dt>SKU</dt><dd className="mono">{product.sku}</dd></div>
              <div><dt>Category</dt><dd>{product.category?.name ?? 'General'}</dd></div>
              <div><dt>Availability</dt><dd>{product.stock > 0 ? `${product.stock} in stock` : 'Sold out'}</dd></div>
              <div><dt>Price</dt><dd>{formatRwf(product.priceRwf)}</dd></div>
            </dl>
          </section>
          <section className="card card-flat seller-info">
            <h2 className="card-title">Seller</h2>
            <div className="row"><span className="seller-avatar" aria-hidden="true">{initials(sellerName)}</span><div><strong>{sellerName}</strong><div className="muted small"><Icon name="pin" size={12} /> {product.seller?.address ?? site.location}</div></div></div>
            {product.seller && <Link href={`/shop?seller=${product.seller.id}`} className="btn btn-outline btn-sm" style={{ marginTop: 16 }}>More from this seller</Link>}
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section-tight" aria-labelledby="related-title">
          <div className="container">
            <div className="section-head"><div><span className="eyebrow">Keep exploring</span><h2 id="related-title">You may also like</h2></div></div>
            <Carousel label="Related products">{related.map(p => <div key={p.id} className="carousel-item"><ProductCard product={p} /></div>)}</Carousel>
          </div>
        </section>
      )}
    </>
  );
}
