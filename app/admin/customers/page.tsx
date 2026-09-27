'use client';

import { useMemo, useState } from 'react';
import { useApi } from '@/lib/use-api';
import { formatDate, formatRwf } from '@/lib/format';
import { DashHeader } from '@/components/dash/DashShell';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

type Customer = { phone: string; name: string; email: string | null; lastAddress: string; orders: number; spentRwf: number; lastOrderAt: string };

export default function CustomersAdmin() {
  const { data, error, loading, reload } = useApi<{ customers: Customer[] }>('/api/admin/customers', { loginPath: '/admin/login' });
  const [q, setQ] = useState('');
  const list = useMemo(() => (data?.customers ?? []).filter(c => `${c.name} ${c.phone} ${c.email ?? ''}`.toLowerCase().includes(q.toLowerCase())), [data, q]);

  return (
    <>
      <DashHeader eyebrow="People" title="Customers" description="Built from checkout details and grouped by phone number. Customer accounts (Supabase) are managed separately." />
      <div className="dash-toolbar"><div className="input-group grow"><Icon name="search" size={18} /><input className="input" placeholder="Search name, phone or email" value={q} onChange={e => setQ(e.target.value)} aria-label="Search customers" /></div></div>
      {loading && !data ? <Skeleton height={320} radius={24} /> : error ? <ErrorState description={error}><Button onClick={() => void reload()}>Retry</Button></ErrorState> : list.length === 0 ? <EmptyState art="bell" title="No customers yet" description="Customers appear after their first order." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Customer</th><th>Phone</th><th className="hide-md">Last delivery address</th><th className="num">Orders</th><th className="num">Spent</th><th>Last order</th></tr></thead>
            <tbody>{list.map(c => <tr key={c.phone}><td><strong>{c.name}</strong>{c.email && <div className="muted tiny">{c.email}</div>}</td><td><a href={`tel:${c.phone}`}>{c.phone}</a></td><td className="hide-md muted small">{c.lastAddress}</td><td className="num">{c.orders}</td><td className="num"><strong>{formatRwf(c.spentRwf)}</strong></td><td className="muted small">{formatDate(c.lastOrderAt)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
