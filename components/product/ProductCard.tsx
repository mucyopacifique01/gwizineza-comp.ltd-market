'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ProductDTO } from '@/lib/types';
import { discountPercent } from '@/lib/format';
import { primaryImage } from '@/lib/merchandising';
import { Icon } from '@/components/ui/Icon';
import { ProductImage } from './ProductImage';
import { Price, StockPill } from './Price';
import { AddToCartButton } from './AddToCartButton';
import { WishlistButton } from './WishlistButton';
import { QuickView } from './QuickView';

export type CardVariant = 'default' | 'compact' | 'list' | 'feature';

export function ProductCard({ product, variant = 'default', priority }: { product: ProductDTO; variant?: CardVariant; priority?: boolean }) {
  const [quick, setQuick] = useState(false);
  const off = discountPercent(product.priceRwf, product.compareAtPriceRwf);
  const href = `/product/${product.slug}`;
  const image = primaryImage(product);
  const out = product.stock < 1;

  return (
    <article className={`pcard pcard-${variant}${out ? ' is-out' : ''}`}>
      <div className="pcard-media">
        <Link href={href} className="pcard-media-link" tabIndex={-1} aria-hidden="true">
          <ProductImage src={image} alt={product.name} priority={priority} sizes={variant === 'feature' ? '(max-width: 900px) 90vw, 50vw' : variant === 'list' ? '160px' : '(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw'} />
        </Link>
        <div className="pcard-flags">
          {off > 0 && <span className="badge badge-clay">−{off}%</span>}
          {product.isFeatured && <span className="badge badge-ink">Featured</span>}
        </div>
        <WishlistButton productId={product.id} name={product.name} />
        {variant !== 'list' && (
          <button type="button" className="pcard-quick" onClick={() => setQuick(true)}>
            <Icon name="eye" size={16} /> Quick view
          </button>
        )}
      </div>
      <div className="pcard-body">
        <div className="pcard-meta">
          {product.category && <Link href={`/shop?category=${product.category.slug}`} className="pcard-cat">{product.category.name}</Link>}
          <StockPill stock={product.stock} />
        </div>
        <h3 className="pcard-name"><Link href={href}>{product.name}</Link></h3>
        <div className="pcard-seller"><span className="node" aria-hidden="true" />{product.seller?.businessName ?? 'Gwizineza Market'}</div>
        {variant === 'list' && product.description && <p className="pcard-desc">{product.description}</p>}
        <div className="pcard-foot">
          <Price value={product.priceRwf} compareAt={product.compareAtPriceRwf} size={variant === 'feature' ? 'lg' : 'md'} />
          <AddToCartButton product={product} compact={variant === 'default' || variant === 'compact'} size={variant === 'list' || variant === 'feature' ? 'md' : 'sm'} />
        </div>
        {variant === 'list' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuick(true)}><Icon name="eye" size={16} /> Quick view</button>}
      </div>
      {quick && <QuickView product={product} onClose={() => setQuick(false)} />}
    </article>
  );
}
