'use client';

import { useEffect, useState } from 'react';
import type { OrderDTO } from '@/lib/types';
import { formatDate, formatRwf } from '@/lib/format';
import { site } from '@/lib/config';
import { Icon } from '@/components/ui/Icon';

export function buildReceiptText(order: OrderDTO, origin: string) {
  const lines = [
    '*Gwizineza Market · Order confirmation*',
    `Order: ${order.orderNumber}`,
    `Date: ${formatDate(order.createdAt, true)}`,
    `Customer: ${order.customerName}`,
    '',
    ...order.items.map(i => `• ${i.productName} × ${i.quantity} = ${formatRwf(i.lineTotalRwf)}`),
    '',
    `Total: ${formatRwf(order.totalRwf)}`,
    'Payment: Pay on delivery',
    `View order: ${origin}/orders/${order.orderNumber}`,
  ];
  return lines.join('\n');
}

/**
 * Client-side receipt actions. WhatsApp uses click-to-chat links: the customer sends the message
 * themselves. Automated WhatsApp sending would need a WhatsApp Business API backend (not present yet).
 */
export function ReceiptActions({ order }: { order: OrderDTO }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const text = encodeURIComponent(buildReceiptText(order, origin));

  return (
    <div className="receipt-actions no-print">
      <a className="btn btn-whatsapp btn-lg" href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> Send receipt via WhatsApp</a>
      {site.whatsapp && <a className="btn btn-outline btn-lg" href={`https://wa.me/${site.whatsapp}?text=${text}`} target="_blank" rel="noopener noreferrer"><Icon name="phone" size={18} /> Message Gwizineza</a>}
      <button className="btn btn-outline btn-lg" onClick={() => window.print()}><Icon name="printer" size={18} /> Print / save PDF</button>
      <button className="btn btn-ghost btn-lg" onClick={() => { void navigator.clipboard?.writeText(order.orderNumber).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }); }}>
        <Icon name={copied ? 'check' : 'link'} size={18} /> {copied ? 'Copied' : 'Copy order number'}
      </button>
    </div>
  );
}
