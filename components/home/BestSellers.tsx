import Link from 'next/link';
import type { ProductDTO } from '@/lib/types';
import { primaryImage } from '@/lib/merchandising';
import { ProductImage } from '@/components/product/ProductImage';
import { Price } from '@/components/product/Price';
import { AddToCartButton } from '@/components/product/AddToCartButton';

/** Ranked list, based on real order quantities (OrderItem). */
export function BestSellers({ products }: { products: ProductDTO[] }) {
  return (
    <ol className="ranked">
      {products.map((p, i) => (
        <li key={p.id} className="ranked-item">
          <span className="ranked-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <Link href={`/product/${p.slug}`} className="ranked-thumb"><ProductImage src={primaryImage(p)} alt={p.name} sizes="80px" /></Link>
          <div className="grow">
            <Link href={`/product/${p.slug}`} className="ranked-name">{p.name}</Link>
            <div className="muted tiny">{p.seller?.businessName ?? 'Gwizineza Market'}</div>
            <Price value={p.priceRwf} compareAt={p.compareAtPriceRwf} size="sm" />
          </div>
          <AddToCartButton product={p} compact size="sm" />
        </li>
      ))}
    </ol>
  );
}
