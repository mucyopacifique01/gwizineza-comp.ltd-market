'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SellerLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/seller/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Seller login failed');
      router.replace('/seller');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Seller login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <div className="admin-card" style={{ maxWidth: 460, margin: '80px auto' }}>
          <div className="eyebrow">Gwizineza Market</div>
          <h1>Seller Admin Login</h1>
          <p className="muted">Sign in to manage products for your approved shop.</p>
          <form className="form" onSubmit={submit}>
            <label>Username</label>
            <input required value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" />
            <label>Password</label>
            <input required type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" />
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          </form>
          {error && <p className="note">{error}</p>}
          <p className="muted" style={{ marginTop: 16 }}><a href="/">← Back to store</a></p>
        </div>
      </div>
    </main>
  );
}
