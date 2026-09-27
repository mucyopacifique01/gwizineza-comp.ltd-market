import Link from 'next/link';
import type { ProductDTO } from '@/lib/types';
import { primaryImage } from '@/lib/merchandising';
import { ProductImage } from '@/components/product/ProductImage';
import { Price } from '@/components/product/Price';
import { ProductCard } from '@/components/product/ProductCard';
import { AddToCartButton } from '@/components/product/AddToCartButton';
import { Icon } from '@/components/ui/Icon';

/** Asymmetric "market stall" layout: one hero product in an arch, smaller cards overlapping around it. */
export function Spotlight({ products }: { products: ProductDTO[] }) {
  const [lead, ...rest] = products;
  if (!lead) return null;
  return (
    <div className="spotlight">
      <article className="spot-lead">
        <div className="spot-lead-media">
          <div className="spot-arch"><ProductImage src={primaryImage(lead)} alt={lead.name} sizes="(max-width: 900px) 80vw, 460px" /></div>
          <span className="spot-number" aria-hidden="true">01</span>
        </div>
        <div className="spot-lead-body">
          <span className="badge badge-sun">Spotlight</span>
          <h3><Link href={`/product/${lead.slug}`}>{lead.name}</Link></h3>
          {lead.description && <p className="muted clamp-3">{lead.description}</p>}
          <div className="pcard-seller"><span className="node" aria-hidden="true" />{lead.seller?.businessName ?? 'Gwizineza Market'}</div>
          <div className="row wrap" style={{ marginTop: 8 }}>
            <Price value={lead.priceRwf} compareAt={lead.compareAtPriceRwf} size="xl" />
          </div>
          <div className="row wrap">
            <AddToCartButton product={lead} size="lg" />
            <Link href={`/product/${lead.slug}`} className="btn btn-ghost btn-lg">Details <Icon name="arrowRight" size={16} /></Link>
          </div>
        </div>
      </article>
      <div className="spot-side">
        {rest.slice(0, 4).map((p, i) => (
          <div key={p.id} className={`spot-side-item spot-side-${i + 1}`}><ProductCard product={p} variant="compact" /></div>
        ))}
      </div>
    </div>
  );
}
