import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrderByNumber } from '@/lib/orders';
import { formatDate, formatRwf, ORDER_STATUS_LABEL } from '@/lib/format';
import { site } from '@/lib/config';
import { LogoMark } from '@/components/brand/Logo';
import { ProductImage } from '@/components/product/ProductImage';
import { ReceiptActions } from '@/components/order/ReceiptActions';
import { Steps } from '@/components/cart/Steps';
import { StatusBadge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your order', robots: { index: false } };

const FLOW = ['ORDERED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
const maskPhone = (p: string) => (p.length > 5 ? `${p.slice(0, 3)} ••• ${p.slice(-3)}` : p);

export default async function OrderPage({ params, searchParams }: { params: { orderNumber: string }; searchParams: { placed?: string } }) {
  const order = await getOrderByNumber(decodeURIComponent(params.orderNumber));
  if (!order) notFound();
  const justPlaced = searchParams.placed === '1';
  const stepIndex = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const cancelled = order.status === 'CANCELLED';

  return (
    <div className="container order-page">
      {justPlaced && (
        <div className="order-hero no-print">
          <Steps current={2} />
          <div className="order-check" aria-hidden="true"><Icon name="check" size={36} strokeWidth={2.6} /></div>
          <h1>Thank you, {order.customerName.split(' ')[0]}!</h1>
          <p className="muted">Your order has been received. We’ll call <strong>{maskPhone(order.phone)}</strong> to confirm delivery.</p>
        </div>
      )}
      {!justPlaced && (
        <header className="page-head no-print">
          <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14} /><span aria-current="page">Order</span></nav>
          <h1>Order {order.orderNumber}</h1>
        </header>
      )}

      <div className="order-layout">
        <article className="receipt card" aria-labelledby="receipt-title">
          <header className="receipt-head">
            <div className="row"><LogoMark size={40} /><div><strong className="receipt-brand">GWIZINEZA MARKET</strong><div className="muted tiny">{site.location}</div></div></div>
            <div className="receipt-id"><span className="muted tiny">Order number</span><strong id="receipt-title" className="mono">{order.orderNumber}</strong></div>
          </header>

          <dl className="receipt-meta">
            <div><dt>Date</dt><dd>{formatDate(order.createdAt, true)}</dd></div>
            <div><dt>Customer</dt><dd>{order.customerName}</dd></div>
            <div><dt>Phone</dt><dd>{maskPhone(order.phone)}</dd></div>
            <div><dt>Order status</dt><dd><StatusBadge status={order.status} /></dd></div>
            <div><dt>Payment status</dt><dd><span className="badge badge-sun badge-dot">Pay on delivery</span></dd></div>
            <div><dt>Receipt status</dt><dd>{site.ebmEnabled ? <span className="badge badge-sky badge-dot">EBM receipt requested</span> : <span className="badge badge-outline">Order confirmation</span>}</dd></div>
            <div className="span-all"><dt>Deliver to</dt><dd>{order.deliveryAddress}</dd></div>
          </dl>

          <table className="receipt-table">
            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Total</th></tr></thead>
            <tbody>
              {order.items.map(i => (
                <tr key={i.id}>
                  <td><div className="row">{i.imageUrl !== undefined && <span className="receipt-thumb no-print"><ProductImage src={i.imageUrl} alt="" sizes="40px" /></span>}{i.slug ? <Link href={`/product/${i.slug}`}>{i.productName}</Link> : i.productName}</div></td>
                  <td className="num">{i.quantity}</td>
                  <td className="num">{formatRwf(i.unitPriceRwf)}</td>
                  <td className="num">{formatRwf(i.lineTotalRwf)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="receipt-totals">
            <div><dt>Subtotal</dt><dd>{formatRwf(order.subtotalRwf)}</dd></div>
            <div><dt>Delivery</dt><dd>{order.deliveryRwf ? formatRwf(order.deliveryRwf) : 'Arranged by phone'}</dd></div>
            <div className="receipt-grand"><dt>Total</dt><dd>{formatRwf(order.totalRwf)}</dd></div>
          </dl>

          <footer className="receipt-foot">
            <p>{site.ebmEnabled ? 'Your official EBM receipt will be issued by Gwizineza Market.' : 'This is an order confirmation, not a tax invoice. An official EBM receipt will be provided when EBM integration is enabled.'}</p>
            <p className="muted tiny">Gwizineza Market · {site.region} · Created by {site.owner}</p>
          </footer>
        </article>

        <aside className="order-aside no-print">
          <section className="card">
            <h2 className="card-title">Order progress</h2>
            {cancelled ? <div className="alert alert-error"><Icon name="alert" size={16} /> This order was cancelled. Contact us if you have questions.</div> : (
              <ol className="timeline">
                {FLOW.map((s, i) => <li key={s} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : undefined}><span className="timeline-dot" /><span>{ORDER_STATUS_LABEL[s]}</span></li>)}
              </ol>
            )}
          </section>
          <section className="card">
            <h2 className="card-title">Get your receipt</h2>
            <ReceiptActions order={order} />
          </section>
          <Link href="/shop" className="btn btn-ghost btn-block"><Icon name="arrowLeft" size={16} /> Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
