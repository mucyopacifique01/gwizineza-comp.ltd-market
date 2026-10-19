'use client';

import { useMemo, useState } from 'react';
import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/format';
import { DashHeader } from '@/components/dash/DashShell';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

type Ticket = {
  id: string; subject: string; message: string; status: string; priority: string;
  email: string | null; phone: string | null; customerName: string | null; createdAt: string;
};

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export default function SupportAdmin() {
  const { data, error, loading, reload } = useApi<{ tickets: Ticket[] }>('/api/admin/support', { loginPath: '/admin/login' });
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const list = useMemo(() => (data?.tickets ?? []).filter(t =>
    `${t.subject} ${t.message} ${t.email ?? ''} ${t.phone ?? ''} ${t.customerName ?? ''}`.toLowerCase().includes(q.toLowerCase())), [data, q]);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      await fetch('/api/admin/support', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      await reload();
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <DashHeader eyebrow="Support" title="Tickets & contact messages" description="Messages from the contact page and customer accounts arrive here." />
      <div className="dash-toolbar">
        <div className="input-group grow"><Icon name="search" size={18} /><input className="input" placeholder="Search subject, message or contact" value={q} onChange={e => setQ(e.target.value)} aria-label="Search tickets" /></div>
        <Button onClick={() => void reload()} variant="outline">Refresh</Button>
      </div>
      {loading && !data ? <Skeleton height={320} radius={24} /> : error ? <ErrorState description={error}><Button onClick={() => void reload()}>Retry</Button></ErrorState> : list.length === 0 ? <EmptyState art="bell" title="No messages yet" description="Customer messages from the contact page will appear here." /> : (
        <div className="stack">
          {list.map(t => (
            <article key={t.id} className="card stack" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong>{t.subject}</strong>
                  <div className="muted tiny">{formatDate(t.createdAt)} · {t.customerName || 'Guest'}{t.email ? ` · ${t.email}` : ''}{t.phone ? ` · ${t.phone}` : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <Badge tone={t.status === 'OPEN' ? 'sky' : t.status === 'RESOLVED' ? 'green' : t.status === 'CLOSED' ? 'neutral' : 'sun'}>{t.status.replace('_', ' ')}</Badge>
                  <select className="input" style={{ width: 'auto' }} value={t.status} disabled={busy === t.id} onChange={e => void setStatus(t.id, e.target.value)} aria-label={`Set status for ${t.subject}`}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{t.message}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
