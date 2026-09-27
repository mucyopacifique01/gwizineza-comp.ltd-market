import Link from 'next/link';
import type { ProductDTO } from '@/lib/types';
import { initials } from '@/lib/format';
import { primaryImage } from '@/lib/merchandising';
import { ImageStack } from '@/components/product/ImageStack';
import { Icon } from '@/components/ui/Icon';

export type PublicSeller = { id: string; businessName: string; address: string | null; since: string; products: ProductDTO[] };

export function SellerCard({ seller }: { seller: PublicSeller }) {
  const [main, ...behind] = seller.products;
  return (
    <Link href={`/shop?seller=${seller.id}`} className="seller-card">
      <div className="seller-card-top">
        <span className="seller-avatar" aria-hidden="true">{initials(seller.businessName)}</span>
        <div className="grow">
          <h3>{seller.businessName}</h3>
          <span className="muted tiny"><Icon name="pin" size={12} /> {seller.address ?? 'Rwanda'}</span>
        </div>
        <span className="badge badge-green"><Icon name="shield" size={12} /> Approved</span>
      </div>
      <div className="seller-card-stack">
        {main ? <ImageStack size="sm" frame="round" main={{ key: main.id, src: primaryImage(main), alt: '' }} behind={behind.slice(0, 2).map(p => ({ key: p.id, src: primaryImage(p), alt: '' }))} /> : <span className="muted small">Products coming soon</span>}
      </div>
      <div className="row-between">
        <span className="small"><strong>{seller.products.length}</strong> product{seller.products.length === 1 ? '' : 's'} live</span>
        <span className="link-arrow small">Visit shop <Icon name="arrowRight" size={14} /></span>
      </div>
    </Link>
  );
}
