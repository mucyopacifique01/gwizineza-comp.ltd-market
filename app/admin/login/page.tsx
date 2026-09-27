'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthScreen } from '@/components/dash/AuthScreen';
import { TextField } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { apiFetch, jsonBody } from '@/lib/http';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      await apiFetch('/api/admin/login', { method: 'POST', body: jsonBody({ password }) });
      window.location.href = '/admin';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      kicker="Owner console"
      title="Welcome back"
      subtitle="Sign in to manage orders, products, sellers and what customers see on the storefront."
      aside={<><h2>Run the whole market from one place.</h2><ul><li><Icon name="receipt" size={18} /> Orders & delivery status</li><li><Icon name="store" size={18} /> Seller approvals</li><li><Icon name="layers" size={18} /> Homepage display control</li><li><Icon name="box" size={18} /> Inventory alerts</li></ul></>}
    >
      <form className="stack" onSubmit={submit}>
        <TextField label="Owner password" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
        {error && <p className="alert alert-error" role="alert"><Icon name="alert" size={16} /> {error}</p>}
        <Button type="submit" size="lg" block loading={loading} icon="lock">Sign in</Button>
      </form>
      <p className="muted small" style={{ marginTop: 20 }}>Are you a seller? <Link href="/seller/login" className="link-arrow">Seller login</Link></p>
    </AuthScreen>
  );
}
