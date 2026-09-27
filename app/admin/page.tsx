'use client';

import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { formatDate, formatRwf } from '@/lib/format';
import { DashHeader, StatCard } from '@/components/dash/DashShell';
import { SalesChart } from '@/components/dash/SalesChart';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProductImage } from '@/components/product/ProductImage';

type Stats = {
  totals: { salesRwf: number; orders: number; products: number; activeProducts: number; sellers: number; pendingSellers: number; customers: number };
  salesByDay: { date: string; totalRwf: number; orders: number }[];
  recentOrders: { id: string; orderNumber: string; customerName: string; totalRwf: number; status: string; createdAt: string }[];
  recentProducts: { id: string; name: string; slug: string; priceRwf: number; stock: number; imageUrl: string | null; isActive: boolean; createdAt: string; seller: { businessName: string } | null }[];
  lowStock: { id: string; name: string; stock: number; imageUrl: string | null; seller: { businessName: string } | null }[];
  sellerActivity: { id: string; businessName: string; status: string; updatedAt: string; _count: { products: number } }[];
};

export default function AdminDashboard() {
  const { data, error, loading, reload } = useApi<Stats>('/api/admin/stats', { loginPath: '/admin/login' });

  return (
    <>
      <DashHeader eyebrow="Overview" title="Good to see you, Mucyo" description="Here is what’s happening across Gwizineza Market." actions={<><ButtonLink href="/admin/products?new=1" icon="plus">Add product</ButtonLink><ButtonLink href="/admin/sellers?new=1" variant="outline" icon="store">Add seller</ButtonLink></>} />
      {loading && !data ? <DashboardSkeleton /> : error ? <ErrorState title="Dashboard unavailable" description={error}><Button icon="refresh" onClick={() => void reload()}>Retry</Button></ErrorState> : data && (
        <div className="stack" style={{ gap: 20 }}>
          <div className="stat-grid">
            <StatCard label="Total sales" value={formatRwf(data.totals.salesRwf)} icon="money" tone="green" hint="Excludes cancelled orders" />
            <StatCard label="Orders" value={data.totals.orders} icon="receipt" tone="sky" />
            <StatCard label="Products" value={data.totals.products} icon="box" hint={`${data.totals.activeProducts} live`} />
            <StatCard label="Sellers" value={data.totals.sellers} icon="store" tone={data.totals.pendingSellers ? 'sun' : 'neutral'} hint={data.totals.pendingSellers ? `${data.totals.pendingSellers} awaiting approval` : 'All reviewed'} />
            <StatCard label="Customers" value={data.totals.customers} icon="users" hint="Unique phone numbers" />
          </div>

          {data.totals.pendingSellers > 0 && (
            <div className="alert alert-warn row-between wrap"><span><Icon name="store" size={16} /> {data.totals.pendingSellers} seller{data.totals.pendingSellers === 1 ? ' is' : 's are'} waiting for your approval.</span><Link href="/admin/sellers?status=PENDING" className="link-arrow">Review</Link></div>
          )}

          <div className="dash-grid">
            <section className="card"><SalesChart days={data.salesByDay} /></section>
            <section className="card">
              <div className="row-between"><h2 className="card-title" style={{ margin: 0 }}>Inventory alerts</h2><Link href="/admin/products?stock=low" className="link-arrow small">Inventory</Link></div>
              {data.lowStock.length === 0 ? <p className="muted small" style={{ marginTop: 16 }}><Icon name="check" size={14} /> All live products are well stocked.</p> : (
                <ul className="mini-list">
                  {data.lowStock.map(p => (
                    <li key={p.id}><span className="mini-thumb"><ProductImage src={p.imageUrl} alt="" sizes="40px" /></span><span className="grow"><strong>{p.name}</strong><small className="muted">{p.seller?.businessName ?? 'Marketplace'}</small></span><span className={`badge ${p.stock === 0 ? 'badge-clay' : 'badge-sun'}`}>{p.stock === 0 ? 'Out' : `${p.stock} left`}</span></li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="card">
            <div className="row-between"><h2 className="card-title" style={{ margin: 0 }}>Recent orders</h2><Link href="/admin/orders" className="link-arrow small">All orders</Link></div>
            {data.recentOrders.length === 0 ? <EmptyState art="orders" title="No orders yet" description="New orders appear here as soon as customers check out." /> : (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table className="table">
                  <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th className="num">Total</th></tr></thead>
                  <tbody>{data.recentOrders.map(o => <tr key={o.id}><td className="mono"><Link href={`/admin/orders?q=${o.orderNumber}`}>{o.orderNumber}</Link></td><td>{o.customerName}</td><td className="muted">{formatDate(o.createdAt, true)}</td><td><StatusBadge status={o.status} /></td><td className="num"><strong>{formatRwf(o.totalRwf)}</strong></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>

          <div className="dash-grid">
            <section className="card">
              <div className="row-between"><h2 className="card-title" style={{ margin: 0 }}>Recent products</h2><Link href="/admin/products" className="link-arrow small">Products</Link></div>
              <ul className="mini-list">
                {data.recentProducts.map(p => <li key={p.id}><span className="mini-thumb"><ProductImage src={p.imageUrl} alt="" sizes="40px" /></span><span className="grow"><strong>{p.name}</strong><small className="muted">{p.seller?.businessName ?? 'Marketplace'} · {formatDate(p.createdAt)}</small></span><span className="small"><strong>{formatRwf(p.priceRwf)}</strong></span></li>)}
              </ul>
            </section>
            <section className="card">
              <div className="row-between"><h2 className="card-title" style={{ margin: 0 }}>Seller activity</h2><Link href="/admin/sellers" className="link-arrow small">Sellers</Link></div>
              {data.sellerActivity.length === 0 ? <p className="muted small" style={{ marginTop: 16 }}>No sellers yet.</p> : (
                <ul className="mini-list">
                  {data.sellerActivity.map(s => <li key={s.id}><span className="seller-avatar sm">{s.businessName.slice(0, 2).toUpperCase()}</span><span className="grow"><strong>{s.businessName}</strong><small className="muted">{s._count.products} products · updated {formatDate(s.updatedAt)}</small></span><StatusBadge status={s.status} /></li>)}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
