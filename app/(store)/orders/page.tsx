'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDate, formatRwf } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';

type Order = {
  id: string;
  orderNumber: string;
  totalRwf: number;
  status: string;
  createdAt: string;
  items: { id: string; productName: string; quantity: number; lineTotalRwf: number }[];
  payment?: { status: string; method: string } | null;
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    void fetch('/api/customer/orders', { credentials: 'include', cache: 'no-store' })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || 'Could not load your orders');
        return body as { orders: Order[] };
      })
      .then(body => { if (alive) setOrders(body.orders || []); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load your orders'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <main className="fig-page">
      <section className="fig-page-hero">
        <div className="container">
          <span className="eyebrow">My Gwizineza</span>
          <div className="fig-page-hero-grid">
            <div>
              <h1>Order history</h1>
              <p>See your orders, payment status, totals, and delivery progress in one place.</p>
              <div className="row wrap fig-page-actions">
                <Link href="/shop" className="btn btn-primary">Continue shopping <Icon name="arrowRight" size={17} /></Link>
                <Link href="/account" className="btn btn-outline">My account</Link>
              </div>
            </div>
            <div className="fig-hero-orb" aria-hidden="true"><Icon name="receipt" size={54} /></div>
          </div>
        </div>
      </section>

      <div className="container fig-page-body">
        {loading ? (
          <div className="fig-empty"><span className="spinner" aria-label="Loading" /><p>Loading your orders…</p></div>
        ) : error ? (
          <div className="fig-empty">
            <Icon name="user" size={34} />
            <h3>Sign in to view your order history</h3>
            <p>{error}</p>
            <Link href="/auth" className="btn btn-primary">Sign in</Link>
          </div>
        ) : orders.length ? (
          <section className="fig-panel-grid">
            {orders.map(order => (
              <article className="fig-panel" key={order.id}>
                <div className="row-between">
                  <div>
                    <span className="eyebrow">Order</span>
                    <h2 className="mono">{order.orderNumber}</h2>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <p className="muted small">{formatDate(order.createdAt, true)}</p>
                <div className="fig-links" style={{ marginTop: 12 }}>
                  {order.items.slice(0, 4).map(item => (
                    <div key={item.id} className="row-between">
                      <span>{item.productName} × {item.quantity}</span>
                      <strong>{formatRwf(item.lineTotalRwf)}</strong>
                    </div>
                  ))}
                </div>
                <div className="row-between" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--fig-line)' }}>
                  <span>Total</span>
                  <strong>{formatRwf(order.totalRwf)}</strong>
                </div>
                <div className="row wrap" style={{ marginTop: 16 }}>
                  <Link href={'/orders/' + encodeURIComponent(order.orderNumber)} className="btn btn-primary">View order</Link>
                  <span className="badge">{order.payment ? order.payment.status + ' · ' + order.payment.method : 'Payment pending'}</span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="fig-empty">
            <Icon name="receipt" size={34} />
            <h3>No orders yet</h3>
            <p>Your completed checkouts will appear here.</p>
            <Link href="/shop" className="btn btn-primary">Start shopping</Link>
          </div>
        )}
      </div>
    </main>
  );
}
