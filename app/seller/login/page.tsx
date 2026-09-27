'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthScreen } from '@/components/dash/AuthScreen';
import { TextField } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { apiFetch, jsonBody } from '@/lib/http';

export default function SellerLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      await apiFetch('/api/seller/auth/login', { method: 'POST', body: jsonBody({ username, password }) });
      window.location.href = '/seller';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seller login failed');
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      kicker="Seller console"
      title="Sign in to your shop"
      subtitle="Use the username and password you received from Gwizineza Market."
      aside={<><h2>Your products, connected to more customers.</h2><ul><li><Icon name="box" size={18} /> Add and edit your products</li><li><Icon name="chart" size={18} /> Track stock and sales</li><li><Icon name="receipt" size={18} /> See orders for your items</li></ul></>}
    >
      <form className="stack" onSubmit={submit}>
        <TextField label="Username" required value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoFocus />
        <TextField label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <p className="alert alert-error" role="alert"><Icon name="alert" size={16} /> {error}</p>}
        <Button type="submit" size="lg" block loading={loading}>Sign in</Button>
      </form>
      <p className="muted small" style={{ marginTop: 20 }}>New sellers are created and approved by the owner. <Link href="/contact" className="link-arrow">Contact us</Link></p>
    </AuthScreen>
  );
}
