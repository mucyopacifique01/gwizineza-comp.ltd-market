'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError('');
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? 'Login failed');
    else router.replace('/admin');
    setLoading(false);
  }

  return <main className="admin-page"><div className="admin-shell"><div className="admin-card" style={{ maxWidth: 460, margin: '80px auto' }}><div className="eyebrow">Gwizineza Market</div><h1>Admin login</h1><p className="muted">Sign in to manage products, sellers, stock, images and orders.</p><form className="form" onSubmit={submit}><label>Password</label><input required type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /><button className="btn btn-primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button></form>{error && <p className="note">{error}</p>}</div></div></main>;
}
