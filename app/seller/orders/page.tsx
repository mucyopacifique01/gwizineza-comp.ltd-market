'use client';

import { useSellerOrders } from '@/components/dash/useSellerProducts';
import { DashHeader, StatCard } from '@/components/dash/DashShell';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { formatDate, formatRwf } from '@/lib/format';

export default function SellerOrdersPage() {
  const { data, error, loading, reload } = useSellerOrders();
  return (
    <>
      <DashHeader eyebrow="Sales" title="Orders" description="Orders that include your products. Only your own items and totals are shown. Delivery is coordinated by Gwizineza Market." actions={<Button variant="outline" icon="refresh" onClick={() => void reload()}>Refresh</Button>} />
      {loading && !data ? <Skeleton height={320} radius={24} /> : error ? <ErrorState description={error}><Button onClick={() => void reload()}>Retry</Button></ErrorState> : (
        <>
          <div className="stat-grid stat-grid-3" style={{ marginBottom: 20 }}>
            <StatCard label="Orders" value={data?.summary.orderCount ?? 0} icon="receipt" />
            <StatCard label="Units sold" value={data?.summary.unitsSold ?? 0} icon="box" tone="sky" />
            <StatCard label="Sales" value={formatRwf(data?.summary.revenueRwf ?? 0)} icon="money" tone="green" hint="Excludes cancelled" />
          </div>
          {!data?.orders.length ? <EmptyState art="orders" title="No orders yet" description="When customers buy your products, the orders appear here." /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Order</th><th>Your items</th><th className="hide-md">Customer · area</th><th>Date</th><th className="num">Your total</th><th>Status</th></tr></thead>
                <tbody>{data.orders.map(o => (
                  <tr key={o.id}>
                    <td className="mono small">{o.orderNumber}</td>
                    <td className="small">{o.items.map(i => <div key={i.id}>{i.productName} × {i.quantity}</div>)}</td>
                    <td className="hide-md small">{o.customerName}<div className="muted tiny">{o.deliveryArea}</div></td>
                    <td className="muted small">{formatDate(o.createdAt)}</td>
                    <td className="num"><strong>{formatRwf(o.totalRwf)}</strong></td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
