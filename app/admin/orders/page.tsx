'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/lib/use-api';
import { useQueryParam } from '@/lib/use-query-param';
import { apiFetch, jsonBody } from '@/lib/http';
import { formatDate, formatRwf, ORDER_STATUS_LABEL } from '@/lib/format';
import { DashHeader } from '@/components/dash/DashShell';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Sheet } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

const STATUSES = ['ORDERED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
type Order = { id: string; orderNumber: string; customerName: string; phone: string; customerEmail?: string | null; deliveryAddress: string; subtotalRwf: number; deliveryRwf: number; totalRwf: number; status: string; createdAt: string; items: { id: string; productName: string; quantity: number; unitPriceRwf: number; lineTotalRwf: number }[] };

export default function OrdersAdmin() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi<{ orders: Order[] }>('/api/admin/orders', { loginPath: '/admin/login' });
  const initialQ = useQueryParam('q');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [open, setOpen] = useState<Order | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => { if (initialQ) setQ(initialQ); }, [initialQ]);

  const orders = useMemo(() => (data?.orders ?? []).filter(o => (status === 'ALL' || o.status === status) && `${o.orderNumber} ${o.customerName} ${o.phone}`.toLowerCase().includes(q.toLowerCase())), [data, q, status]);
  const counts = useMemo(() => Object.fromEntries(STATUSES.map(s => [s, (data?.orders ?? []).filter(o => o.status === s).length])), [data]);

  async function change(order: Order, next: string) {
    setSaving(order.id);
    try {
      await apiFetch('/api/admin/orders', { method: 'PATCH', body: jsonBody({ id: order.id, status: next }) });
      setData(d => d && { orders: d.orders.map(o => (o.id === order.id ? { ...o, status: next } : o)) });
      setOpen(o => (o && o.id === order.id ? { ...o, status: next } : o));
      toast.show(`${order.orderNumber} → ${ORDER_STATUS_LABEL[next]}`);
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Could not update order', { tone: 'error' }); }
    finally { setSaving(null); }
  }

  return (
    <>
      <DashHeader eyebrow="Sales" title="Orders" description="Review customer orders and move them through delivery. Showing the latest 100." actions={<Button variant="outline" icon="refresh" onClick={() => void reload()}>Refresh</Button>} />
      <div className="dash-toolbar">
        <div className="input-group grow"><Icon name="search" size={18} /><input className="input" placeholder="Search order number, name or phone" value={q} onChange={e => setQ(e.target.value)} aria-label="Search orders" /></div>
        <div className="segmented scroll-x" role="tablist" aria-label="Filter by status">
          <button role="tab" aria-selected={status === 'ALL'} onClick={() => setStatus('ALL')}>All</button>
          {STATUSES.map(s => <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)}>{ORDER_STATUS_LABEL[s]} <span className="muted tiny">{counts[s] ?? 0}</span></button>)}
        </div>
      </div>

      {loading && !data ? <Skeleton height={360} radius={24} /> : error ? <ErrorState description={error}><Button onClick={() => void reload()}>Retry</Button></ErrorState> : orders.length === 0 ? (
        <EmptyState art="orders" title={data?.orders.length ? 'No orders match' : 'No orders yet'} description={data?.orders.length ? 'Try another search or status.' : 'Orders appear here as soon as customers check out.'} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th className="hide-md">Items</th><th>Date</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="mono"><button className="linklike" onClick={() => setOpen(o)}>{o.orderNumber}</button></td>
                  <td><strong>{o.customerName}</strong><div className="muted tiny">{o.phone}</div></td>
                  <td className="hide-md muted small">{o.items.map(i => `${i.productName} × ${i.quantity}`).join(', ')}</td>
                  <td className="muted small">{formatDate(o.createdAt, true)}</td>
                  <td className="num"><strong>{formatRwf(o.totalRwf)}</strong></td>
                  <td>
                    <select className="select select-sm" value={o.status} disabled={saving === o.id} onChange={e => void change(o, e.target.value)} aria-label={`Status for ${o.orderNumber}`}>
                      {STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td><Button variant="ghost" size="sm" iconOnly icon="eye" onClick={() => setOpen(o)} aria-label={`View ${o.orderNumber}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} side="right" title={open?.orderNumber ?? 'Order'}>
        {open && (
          <div className="stack">
            <div className="row-between"><StatusBadge status={open.status} /><span className="muted small">{formatDate(open.createdAt, true)}</span></div>
            <dl className="spec">
              <div><dt>Customer</dt><dd>{open.customerName}</dd></div>
              <div><dt>Phone</dt><dd><a href={`tel:${open.phone}`}>{open.phone}</a></dd></div>
              {open.customerEmail && <div><dt>Email</dt><dd>{open.customerEmail}</dd></div>}
              <div><dt>Deliver to</dt><dd style={{ maxWidth: 220 }}>{open.deliveryAddress}</dd></div>
            </dl>
            <h3 className="card-title" style={{ margin: '8px 0 0' }}>Items</h3>
            <ul className="mini-list">{open.items.map(i => <li key={i.id}><span className="grow"><strong>{i.productName}</strong><small className="muted">{i.quantity} × {formatRwf(i.unitPriceRwf)}</small></span><strong className="small">{formatRwf(i.lineTotalRwf)}</strong></li>)}</ul>
            <div className="row-between summary-total"><strong>Total</strong><strong style={{ fontSize: 22 }}>{formatRwf(open.totalRwf)}</strong></div>
            <label className="field"><span className="field-label">Update status</span>
              <select className="select" value={open.status} disabled={saving === open.id} onChange={e => void change(open, e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
            </label>
            <a className="btn btn-outline" href={`/orders/${open.orderNumber}`} target="_blank" rel="noreferrer"><Icon name="receipt" size={16} /> Open customer receipt</a>
          </div>
        )}
      </Sheet>
    </>
  );
}
