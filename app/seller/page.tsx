'use client';

import Link from 'next/link';
import { useSeller } from '@/components/dash/SellerContext';
import { useSellerOrders, useSellerProducts } from '@/components/dash/useSellerProducts';
import { DashHeader, StatCard } from '@/components/dash/DashShell';
import { ProductImage } from '@/components/product/ProductImage';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatDate, formatRwf } from '@/lib/format';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';

export default function SellerDashboard() {
  const { seller } = useSeller();
  const products = useSellerProducts();
  const orders = useSellerOrders();
  const list = products.data?.products ?? [];
  const low = list.filter(p => p.isActive && p.stock <= LOW_STOCK_THRESHOLD);
  const totalStock = list.reduce((s, p) => s + p.stock, 0);

  return (
    <>
      <DashHeader eyebrow="Seller dashboard" title={seller ? `Hello, ${seller.ownerName.split(' ')[0]}` : 'Hello'} description={seller ? `${seller.businessName} · your shop at a glance` : undefined} actions={<ButtonLink href="/seller/products?new=1" icon="plus">Add product</ButtonLink>} />
      {(products.loading && !products.data) ? <DashboardSkeleton /> : products.error ? <ErrorState description={products.error}><Button onClick={() => void products.reload()}>Retry</Button></ErrorState> : (
        <div className="stack" style={{ gap: 20 }}>
          <div className="stat-grid">
            <StatCard label="Products" value={list.length} icon="box" hint={`${list.filter(p => p.isActive).length} visible`} />
            <StatCard label="Units in stock" value={totalStock} icon="layers" tone="sky" />
            <StatCard label="Low stock" value={low.length} icon="alert" tone={low.length ? 'sun' : 'neutral'} hint={`≤ ${LOW_STOCK_THRESHOLD} units`} />
            <StatCard label="Orders" value={orders.data?.summary.orderCount ?? '—'} icon="receipt" />
            <StatCard label="Sales" value={orders.data ? formatRwf(orders.data.summary.revenueRwf) : '—'} icon="money" tone="green" hint={orders.data ? `${orders.data.summary.unitsSold} units sold` : undefined} />
          </div>
          <div className="dash-grid">
            <section className="card">
              <div className="row-between"><h2 className="card-title" style={{ margin: 0 }}>Recent orders</h2><Link href="/seller/orders" className="link-arrow small">All orders</Link></div>
              {orders.error ? <p className="alert alert-error" style={{ marginTop: 12 }}>{orders.error}</p> : !orders.data?.orders.length ? <EmptyState art="orders" title="No orders yet" description="Orders that include your products will show here." /> : (
                <ul className="mini-list">{orders.data.orders.slice(0, 6).map(o => <li key={o.id}><span className="grow"><strong className="mono">{o.orderNumber}</strong><small className="muted">{o.items.map(i => `${i.productName} × ${i.quantity}`).join(', ')} · {formatDate(o.createdAt)}</small></span><span className="stack" style={{ gap: 4, alignItems: 'flex-end' }}><strong className="small">{formatRwf(o.totalRwf)}</strong><StatusBadge status={o.status} /></span></li>)}</ul>
              )}
            </section>
            <section className="card">
              <div className="row-between"><h2 className="card-title" style={{ margin: 0 }}>Stock alerts</h2><Link href="/seller/products" className="link-arrow small">Manage stock</Link></div>
              {low.length === 0 ? <p className="muted small" style={{ marginTop: 16 }}><Icon name="check" size={14} /> All your visible products are well stocked.</p> : (
                <ul className="mini-list">{low.map(p => <li key={p.id}><span className="mini-thumb"><ProductImage src={p.imageUrl} alt="" sizes="40px" /></span><span className="grow"><strong>{p.name}</strong><small className="muted">{p.sku}</small></span><span className={`badge ${p.stock === 0 ? 'badge-clay' : 'badge-sun'}`}>{p.stock === 0 ? 'Out' : `${p.stock} left`}</span></li>)}</ul>
              )}
            </section>
          </div>
          {list.length === 0 && <EmptyState art="box" title="Your shelf is empty" description="Add your first product. It goes live in the store as soon as you save it."><ButtonLink href="/seller/products?new=1" icon="plus">Add product</ButtonLink></EmptyState>}
        </div>
      )}
    </>
  );
}
