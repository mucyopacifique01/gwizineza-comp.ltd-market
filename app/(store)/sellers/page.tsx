import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicSellers } from '@/lib/catalog';
import { SellerCard } from '@/components/seller/SellerCard';
import { EmptyState } from '@/components/ui/States';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sellers', description: 'Meet the approved local sellers on Gwizineza Market.' };

export default async function SellersPage() {
  const sellers = await getPublicSellers();
  return (
    <div className="container section-tight">
      <header className="page-head sellers-head">
        <div>
          <span className="eyebrow">The marketplace</span>
          <h1>Meet our sellers</h1>
          <p className="muted">Every seller on Gwizineza Market is created and approved by the owner before they can list products.</p>
        </div>
        <div className="card sell-with-us">
          <Icon name="store" size={24} />
          <div><strong>Want to sell with us?</strong><p className="muted small">Seller accounts are created by Gwizineza Market. Get in touch to apply.</p></div>
          <Link href="/contact" className="btn btn-dark btn-sm">Contact us</Link>
        </div>
      </header>
      {sellers.length ? <div className="seller-grid">{sellers.map(s => <SellerCard key={s.id} seller={s} />)}</div> : (
        <EmptyState art="box" title="Sellers are joining soon" description="Products are currently sold directly by Gwizineza Market."><Link href="/shop" className="btn btn-primary">Shop now</Link></EmptyState>
      )}
    </div>
  );
}
