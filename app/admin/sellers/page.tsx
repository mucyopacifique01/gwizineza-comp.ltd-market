'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useApi } from '@/lib/use-api';
import { useQueryParam } from '@/lib/use-query-param';
import { apiFetch, jsonBody } from '@/lib/http';
import { formatDate, initials } from '@/lib/format';
import { DashHeader, StatCard } from '@/components/dash/DashShell';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Sheet } from '@/components/ui/Modal';
import { Button, ButtonLink } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

type Seller = { id: string; businessName: string; ownerName: string; phone: string; email: string | null; address: string | null; loginUsername: string | null; status: 'PENDING' | 'APPROVED' | 'SUSPENDED'; createdAt?: string; _count: { products: number } };
const emptyForm = { businessName: '', ownerName: '', phone: '', email: '', address: 'Kabarondo, Kayonza, Rwanda', loginUsername: '', password: '' };

export default function SellersAdmin() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi<{ sellers: Seller[] }>('/api/sellers', { loginPath: '/admin/login' });
  const qNew = useQueryParam('new');
  const qStatus = useQueryParam('status');
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<Seller | null>(null);
  const [filter, setFilter] = useState<'ALL' | Seller['status']>('ALL');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { if (qNew) setCreating(true); }, [qNew]);
  useEffect(() => { if (qStatus === 'PENDING' || qStatus === 'APPROVED' || qStatus === 'SUSPENDED') setFilter(qStatus); }, [qStatus]);

  const sellers = data?.sellers ?? [];
  const list = useMemo(() => sellers.filter(s => (filter === 'ALL' || s.status === filter) && `${s.businessName} ${s.ownerName} ${s.phone} ${s.loginUsername ?? ''}`.toLowerCase().includes(q.toLowerCase())), [sellers, filter, q]);
  const count = (s: Seller['status']) => sellers.filter(x => x.status === s).length;

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setFormError(null);
    try {
      await apiFetch('/api/sellers', { method: 'POST', body: jsonBody(form) });
      toast.show('Seller created as pending. Approve them to allow login.');
      setForm(emptyForm); setCreating(false); await reload();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not create seller'); }
    finally { setSaving(false); }
  }

  async function setStatus(s: Seller, status: Seller['status']) {
    if (status === 'SUSPENDED' && !window.confirm(`Suspend ${s.businessName}? Their products will be hidden and they won’t be able to log in.`)) return;
    setBusy(s.id);
    try {
      await apiFetch('/api/sellers', { method: 'PATCH', body: jsonBody({ id: s.id, status }) });
      setData(d => d && { sellers: d.sellers.map(x => (x.id === s.id ? { ...x, status } : x)) });
      setView(v => (v && v.id === s.id ? { ...v, status } : v));
      toast.show(`${s.businessName} is now ${status.toLowerCase()}`);
    } catch (err) { toast.show(err instanceof Error ? err.message : 'Could not update status', { tone: 'error' }); }
    finally { setBusy(null); }
  }

  const actions = (s: Seller) => (
    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
      {s.status !== 'APPROVED' && <Button size="sm" loading={busy === s.id} onClick={() => void setStatus(s, 'APPROVED')}>{s.status === 'SUSPENDED' ? 'Reactivate' : 'Approve'}</Button>}
      {s.status === 'APPROVED' && <Button size="sm" variant="outline" loading={busy === s.id} onClick={() => void setStatus(s, 'SUSPENDED')}>Suspend</Button>}
      <Button size="sm" variant="ghost" iconOnly icon="eye" onClick={() => setView(s)} aria-label={`View ${s.businessName}`} />
    </div>
  );

  return (
    <>
      <DashHeader eyebrow="Marketplace" title="Sellers" description="Create seller accounts, approve them, and suspend when needed. New sellers start as pending." actions={<Button icon="plus" onClick={() => setCreating(true)}>Create seller</Button>} />
      <div className="stat-grid stat-grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Approved" value={count('APPROVED')} icon="shield" tone="green" />
        <StatCard label="Pending approval" value={count('PENDING')} icon="clock" tone={count('PENDING') ? 'sun' : 'neutral'} />
        <StatCard label="Suspended" value={count('SUSPENDED')} icon="lock" tone={count('SUSPENDED') ? 'clay' : 'neutral'} />
      </div>
      <div className="dash-toolbar">
        <div className="input-group grow"><Icon name="search" size={18} /><input className="input" placeholder="Search sellers" value={q} onChange={e => setQ(e.target.value)} aria-label="Search sellers" /></div>
        <div className="segmented" role="tablist" aria-label="Filter sellers">
          {(['ALL', 'PENDING', 'APPROVED', 'SUSPENDED'] as const).map(s => <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)}>{s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}</button>)}
        </div>
      </div>

      {loading && !data ? <Skeleton height={320} radius={24} /> : error ? <ErrorState description={error}><Button onClick={() => void reload()}>Retry</Button></ErrorState> : list.length === 0 ? (
        <EmptyState art="box" title={sellers.length ? 'No sellers match' : 'No sellers yet'} description={sellers.length ? 'Try another filter.' : 'Create your first seller to open the marketplace.'}><Button icon="plus" onClick={() => setCreating(true)}>Create seller</Button></EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Business</th><th className="hide-md">Owner</th><th className="hide-md">Login</th><th className="num">Products</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map(s => (
              <tr key={s.id}>
                <td><div className="row"><span className="seller-avatar sm">{initials(s.businessName)}</span><div><strong>{s.businessName}</strong><div className="muted tiny">{s.phone}</div></div></div></td>
                <td className="hide-md">{s.ownerName}</td>
                <td className="hide-md mono small">{s.loginUsername ?? <span className="muted">not set</span>}</td>
                <td className="num">{s._count.products}</td>
                <td><StatusBadge status={s.status} /></td>
                <td>{actions(s)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Sheet open={creating} onClose={() => setCreating(false)} side="right" title="Create seller">
        <form className="stack" onSubmit={create}>
          <p className="muted small">The seller starts as <strong>pending</strong>. Share the login details after you approve the account. Passwords are stored hashed.</p>
          <TextField label="Business name" required value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="ABC Shop" />
          <TextField label="Owner name" required value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} />
          <div className="form-grid cols-2">
            <TextField label="Phone" required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXX" />
            <TextField label="Email" optional type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <TextField label="Business address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <div className="divider" />
          <div className="form-grid cols-2">
            <TextField label="Seller username" required minLength={3} value={form.loginUsername} onChange={e => setForm({ ...form, loginUsername: e.target.value })} autoComplete="off" />
            <TextField label="Seller password" required minLength={8} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" hint="At least 8 characters" />
          </div>
          {formError && <p className="alert alert-error" role="alert">{formError}</p>}
          <div className="editor-actions"><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" loading={saving}>Create seller</Button></div>
        </form>
      </Sheet>

      <Sheet open={Boolean(view)} onClose={() => setView(null)} side="right" title={view?.businessName ?? 'Seller'}>
        {view && (
          <div className="stack">
            <div className="row"><span className="seller-avatar big">{initials(view.businessName)}</span><div><h3 style={{ fontSize: 22 }}>{view.businessName}</h3><StatusBadge status={view.status} /></div></div>
            <dl className="spec">
              <div><dt>Owner</dt><dd>{view.ownerName}</dd></div>
              <div><dt>Phone</dt><dd><a href={`tel:${view.phone}`}>{view.phone}</a></dd></div>
              <div><dt>Email</dt><dd>{view.email ?? '—'}</dd></div>
              <div><dt>Address</dt><dd>{view.address ?? '—'}</dd></div>
              <div><dt>Login username</dt><dd className="mono">{view.loginUsername ?? '—'}</dd></div>
              <div><dt>Products</dt><dd>{view._count.products}</dd></div>
              {view.createdAt && <div><dt>Created</dt><dd>{formatDate(view.createdAt)}</dd></div>}
            </dl>
            {actions(view)}
            <ButtonLink href={`/admin/products`} variant="outline" icon="box">Manage products</ButtonLink>
            <p className="field-hint">Editing seller details or resetting a password needs an extra API (see upgrade notes).</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
