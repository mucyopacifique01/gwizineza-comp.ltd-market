import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'green' | 'sun' | 'sky' | 'clay' | 'ink' | 'outline';

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: BadgeTone; dot?: boolean; children: ReactNode; className?: string }) {
  return <span className={['badge', tone !== 'neutral' && `badge-${tone}`, dot && 'badge-dot', className].filter(Boolean).join(' ')}>{children}</span>;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  APPROVED: 'green', PENDING: 'sun', SUSPENDED: 'clay',
  ORDERED: 'sky', PROCESSING: 'sun', SHIPPED: 'sky', DELIVERED: 'green', CANCELLED: 'clay',
};
const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Approved', PENDING: 'Pending', SUSPENDED: 'Suspended',
  ORDERED: 'Received', PROCESSING: 'Preparing', SHIPPED: 'On the way', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot>{STATUS_LABEL[status] ?? status}</Badge>;
}
