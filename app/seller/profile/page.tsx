'use client';

import { useSeller } from '@/components/dash/SellerContext';
import { DashHeader } from '@/components/dash/DashShell';
import { StatusBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button, ButtonLink } from '@/components/ui/Button';
import { initials } from '@/lib/format';

export default function SellerProfilePage() {
  const { seller, loading, error, reload } = useSeller();
  return (
    <>
      <DashHeader eyebrow="Account" title="Profile" description="Your business details as registered by Gwizineza Market." />
      {loading && !seller ? <Skeleton height={280} radius={24} /> : error ? <ErrorState description={error}><Button onClick={() => void reload()}>Retry</Button></ErrorState> : seller && (
        <div className="dash-grid dash-grid-side">
          <section className="card stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            <span className="seller-avatar big">{initials(seller.businessName)}</span>
            <h2 style={{ fontSize: 22 }}>{seller.businessName}</h2>
            <StatusBadge status={seller.status} />
            <p className="muted small">{seller._count.products} product{seller._count.products === 1 ? '' : 's'}</p>
            <ButtonLink href={`/shop?seller=${seller.id}`} variant="outline" icon="store">View my shop page</ButtonLink>
          </section>
          <section className="card">
            <h2 className="card-title">Business details</h2>
            <dl className="spec">
              <div><dt>Business name</dt><dd>{seller.businessName}</dd></div>
              <div><dt>Owner</dt><dd>{seller.ownerName}</dd></div>
              <div><dt>Phone</dt><dd>{seller.phone}</dd></div>
              <div><dt>Email</dt><dd>{seller.email ?? '—'}</dd></div>
              <div><dt>Address</dt><dd>{seller.address ?? '—'}</dd></div>
            </dl>
            <p className="alert" style={{ marginTop: 16 }}>To change these details or your password, contact the Gwizineza Market owner.</p>
          </section>
        </div>
      )}
    </>
  );
}
