import type { ReactNode } from 'react';
import { formatRwf } from '@/lib/format';

/**
 * Totals panel. Delivery is currently 0 on the server (see /api/checkout), and is arranged by phone,
 * so we show it honestly instead of inventing a fee.
 */
export function OrderSummary({ subtotal, itemCount, children, title = 'Order summary' }: { subtotal: number; itemCount: number; children?: ReactNode; title?: string }) {
  return (
    <div className="summary">
      <h2 className="summary-title">{title}</h2>
      <dl className="summary-rows">
        <div><dt>Subtotal <span className="muted">({itemCount} item{itemCount === 1 ? '' : 's'})</span></dt><dd>{formatRwf(subtotal)}</dd></div>
        <div><dt>Delivery</dt><dd className="muted">Arranged after order</dd></div>
        <div className="summary-total"><dt>Total to pay</dt><dd>{formatRwf(subtotal)}</dd></div>
      </dl>
      <p className="summary-note">No delivery fee is added online. Our team confirms delivery with you by phone.</p>
      {children}
    </div>
  );
}
