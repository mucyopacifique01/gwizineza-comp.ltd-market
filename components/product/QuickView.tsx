'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ProductDTO } from '@/lib/types';
import { primaryImage } from '@/lib/merchandising';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { ProductImage } from './ProductImage';
import { Price, StockPill } from './Price';
import { AddToCartButton } from './AddToCartButton';
import { QuantityStepper } from './QuantityStepper';

export function QuickView({ product, onClose }: { product: ProductDTO; onClose: () => void }) {
  const gallery = product.images.length ? product.images.map(i => ({ src: i.url, alt: i.altText ?? product.name })) : [{ src: primaryImage(product), alt: product.name }];
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  return (
    <Modal open onClose={onClose} title="Quick view">
      <div className="modal-body quickview">
        <div className="quickview-media">
          <div className="quickview-main"><ProductImage src={gallery[active]?.src} alt={gallery[active]?.alt ?? product.name} sizes="(max-width: 640px) 90vw, 340px" /></div>
          {gallery.length > 1 && (
            <div className="thumbs">
              {gallery.slice(0, 5).map((g, i) => (
                <button key={i} type="button" className={`thumb${i === active ? ' is-active' : ''}`} onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-pressed={i === active}>
                  <ProductImage src={g.src} alt="" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="stack">
          <div className="row wrap">{product.category && <span className="badge">{product.category.name}</span>}<StockPill stock={product.stock} /></div>
          <h3 style={{ fontSize: 'var(--fs-2xl)' }}>{product.name}</h3>
          <div className="pcard-seller"><span className="node" aria-hidden="true" />Sold by {product.seller?.businessName ?? 'Gwizineza Market'}</div>
          <Price value={product.priceRwf} compareAt={product.compareAtPriceRwf} size="lg" />
          {product.description && <p className="muted clamp-4">{product.description}</p>}
          {product.stock > 0 && <QuantityStepper value={qty} max={product.stock} onChange={setQty} />}
          <AddToCartButton product={product} quantity={qty} size="lg" block />
          <Link href={`/product/${product.slug}`} className="link-arrow" onClick={onClose}>See full details <Icon name="arrowRight" size={16} /></Link>
        </div>
      </div>
    </Modal>
  );
}
