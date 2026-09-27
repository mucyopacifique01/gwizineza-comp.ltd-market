'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { TextField } from '@/components/ui/Field';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/brand/Logo';

type Mode = 'signin' | 'signup';
type Customer = { id: string; name: string; email: string | null; phone: string | null; avatarUrl: string | null; hasPassword: boolean };

/**
 * Customer account: native sign-up/sign-in with name, contact (email or phone), password,
 * and Google. Sessions are signed HttpOnly cookies issued by /api/customer/auth/*.
 */
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'google-not-configured') setError('Google sign-in is not set up yet. Use email or phone to create your account.');
    else if (params.get('error') === 'google-failed') setError('Google sign-in did not complete. Please try again.');
    if (params.get('signedIn')) setMessage('You are signed in.');
    window.history.replaceState({}, '', '/auth');
    fetch('/api/customer/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setCustomer(data?.customer ?? null))
      .catch(() => setCustomer(null))
      .finally(() => setChecking(false));
  }, []);

  const clear = () => { setMessage(''); setError(''); };

  async function submit(event: FormEvent) {
    event.preventDefault(); clear(); setLoading(true);
    try {
      const response = await fetch(mode === 'signup' ? '/api/customer/auth/register' : '/api/customer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signup' ? { name, contact, password } : { contact, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Authentication failed.');
      setCustomer(data.customer);
      setMessage(mode === 'signup' ? 'Welcome to Gwizineza Market! Your account is ready.' : 'You are signed in.');
      if (mode === 'signup') { setName(''); }
      setContact(''); setPassword('');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  function google() {
    clear(); setLoading(true);
    window.location.href = '/api/customer/auth/google';
  }

  async function signOut() {
    await fetch('/api/customer/auth/logout', { method: 'POST' }).catch(() => undefined);
    setCustomer(null); setMessage('You have signed out.'); setLoading(false);
  }

  const contactLabel = contact.includes('@') ? 'Email address' : 'Phone number';

  return (
    <div className="container auth-page">
      <div className="auth-card card">
        <div className="auth-head"><LogoMark size={44} /><h1>{customer ? `Hi, ${customer.name.split(' ')[0]}` : mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1><p className="muted">{customer ? 'You are signed in to Gwizineza Market.' : 'Sign up with Google, or with your name, phone/email and a password.'}</p></div>

        {checking ? <div className="stack" aria-busy="true"><div className="skeleton" style={{ height: 48, borderRadius: 999 }} /><div className="skeleton" style={{ height: 200, borderRadius: 20 }} /></div>
          : customer ? (
            <div className="stack">
              <div className="alert alert-success"><Icon name="check" size={16} /> {customer.name}{customer.email ? ` · ${customer.email}` : customer.phone ? ` · ${customer.phone}` : ''}</div>
              <ButtonLink href="/shop" size="lg" block>Continue shopping</ButtonLink>
              <Button variant="outline" block onClick={signOut} icon="logout">Sign out</Button>
            </div>
          ) : (
            <div className="stack">
              <div className="segmented segmented-block" role="tablist" aria-label="Account mode">
                <button role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); clear(); }}>Sign in</button>
                <button role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); clear(); }}>Sign up</button>
              </div>
              <Button variant="outline" size="lg" block onClick={google} disabled={loading}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
                {mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
              </Button>
              <div className="or"><span>or</span></div>
              <form className="stack" onSubmit={submit}>
                {mode === 'signup' && <TextField label="Full name" required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" />}
                <TextField label={`${contactLabel} (email or phone)`} required value={contact} onChange={e => setContact(e.target.value)} placeholder="you@example.com or +250 7XX XXX XXX" autoComplete="username" />
                <TextField label="Password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                <Button type="submit" size="lg" block loading={loading}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Button>
              </form>
            </div>
          )}
        {message && <p className="alert alert-success" style={{ marginTop: 16 }}>{message}</p>}
        {error && <p className="alert alert-error" role="alert" style={{ marginTop: 16 }}>{error}</p>}
        <p className="muted small auth-foot">Shopping as a guest works too: an account is not required to check out. <Link href="/seller/login">Seller login</Link></p>
      </div>
    </div>
  );
}
