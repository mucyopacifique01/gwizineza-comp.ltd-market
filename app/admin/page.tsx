'use client';

import { FormEvent, useEffect, useState } from 'react';

type Seller = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string | null;
  address: string | null;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  _count: { products: number };
};

export default function AdminPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ businessName: '', ownerName: '', phone: '', email: '', address: 'Kabarondo, Kayonza, Rwanda' });

  async function load() {
    setLoading(true);
    const response = await fetch('/api/sellers', { cache: 'no-store' });
    const data = await response.json();
    setSellers(data.sellers ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addSeller(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const response = await fetch('/api/sellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? 'Could not add seller.'); return; }
    setForm({ businessName: '', ownerName: '', phone: '', email: '', address: 'Kabarondo, Kayonza, Rwanda' });
    setMessage('Seller added and approved.');
    await load();
  }

  async function changeStatus(id: string, status: Seller['status']) {
    const response = await fetch('/api/sellers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok) await load();
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div><div className="eyebrow">Gwizineza Market</div><h1>Admin · Sellers</h1><p className="muted">Manage the marketplace sellers and control who can operate on the platform.</p></div>
          <a className="btn btn-secondary" href="/">← Store</a>
        </header>

        <section className="admin-stats">
          <div className="admin-stat"><strong>{sellers.length}</strong><span>Total sellers</span></div>
          <div className="admin-stat"><strong>{sellers.filter(s => s.status === 'APPROVED').length}</strong><span>Approved</span></div>
          <div className="admin-stat"><strong>{sellers.filter(s => s.status === 'PENDING').length}</strong><span>Pending</span></div>
          <div className="admin-stat"><strong>{sellers.reduce((n, s) => n + s._count.products, 0)}</strong><span>Seller products</span></div>
        </section>

        <section className="admin-grid">
          <div className="admin-card">
            <div className="eyebrow">Add seller</div><h2>Create a seller</h2>
            <form className="form" onSubmit={addSeller}>
              <label>Business name</label><input required value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="ABC Shop" />
              <label>Owner name</label><input required value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} placeholder="Seller owner" />
              <label>Phone</label><input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXX" />
              <label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="seller@example.com" />
              <label>Business address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <button className="btn btn-primary" type="submit">Add seller</button>
            </form>
            {message && <p className="note">{message}</p>}
          </div>

          <div className="admin-card">
            <div className="eyebrow">Marketplace</div><h2>Seller list</h2>
            {loading ? <p>Loading sellers...</p> : sellers.length === 0 ? <p className="muted">No sellers yet. Add the first seller using the form.</p> : <div className="seller-list">
              {sellers.map(seller => <article className="seller-row" key={seller.id}>
                <div><strong>{seller.businessName}</strong><div className="muted">Owner: {seller.ownerName} · {seller.phone}</div><div className="muted">{seller.address ?? 'No address'} · {seller._count.products} products</div></div>
                <div className="seller-actions"><span className={`status status-${seller.status.toLowerCase()}`}>{seller.status}</span>{seller.status !== 'APPROVED' && <button className="btn btn-primary" onClick={() => changeStatus(seller.id, 'APPROVED')}>Approve</button>}{seller.status === 'APPROVED' && <button className="btn btn-secondary" onClick={() => changeStatus(seller.id, 'SUSPENDED')}>Suspend</button>}{seller.status === 'SUSPENDED' && <button className="btn btn-primary" onClick={() => changeStatus(seller.id, 'APPROVED')}>Reactivate</button>}</div>
              </article>)}
            </div>}
          </div>
        </section>

        <div className="admin-warning"><strong>Security:</strong> this is the admin/seller management foundation. Authentication and role-based authorization must be added before this page or its API is exposed publicly.</div>
      </div>
    </main>
  );
}
