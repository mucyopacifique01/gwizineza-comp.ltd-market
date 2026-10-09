'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { TextField } from '@/components/ui/Field';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/brand/Logo';

type Mode = 'signin' | 'signup';
type Step = 'contact' | 'verify';
type Customer = { id: string; name: string; email: string | null; phone: string | null; avatarUrl: string | null; hasPassword: boolean };

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [step, setStep] = useState<Step>('contact');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/customer/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setCustomer(data?.customer ?? null))
      .catch(() => setCustomer(null))
      .finally(() => setChecking(false));
  }, []);

  const clear = () => { setMessage(''); setError(''); };

  async function sendCode() {
    clear();
    if (mode === 'signup' && name.trim().length < 2) {
      setError('Enter your full name before requesting a code.');
      return;
    }
    if (!contact.trim()) {
      setError('Enter your email address or phone number.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/customer/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim(), name: name.trim() || undefined, createUser: mode === 'signup' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'We could not send your verification code.');
      setStep('verify');
      setMessage('We sent a one-time code. Check your email inbox or phone messages.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not send your verification code.');
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step === 'contact') {
      await sendCode();
      return;
    }
    clear();
    if (!/^\d{6,8}$/.test(code.replace(/\s+/g, ''))) {
      setError('Enter the verification code you received.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/customer/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim(), code: code.trim(), name: name.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'That code could not be verified.');
      setCustomer(data.customer);
      setMessage('You are signed in securely.');
      setContact('');
      setCode('');
      setName('');
      setStep('contact');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code could not be verified.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch('/api/customer/auth/logout', { method: 'POST' }).catch(() => undefined);
    setCustomer(null);
    setMessage('You have signed out.');
    setLoading(false);
  }

  const isEmail = contact.includes('@');

  return (
    <div className="container auth-page fig-auth-page">
      <div className="auth-card card">
        <div className="auth-head">
          <LogoMark size={44} />
          <h1>{customer ? 'Hi, ' + customer.name.split(' ')[0] : mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="muted">{customer ? 'You are signed in to Gwizineza Market.' : 'Sign in securely with a one-time code sent to your email or phone.'}</p>
        </div>

        {checking ? (
          <div className="stack" aria-busy="true">
            <div className="skeleton" style={{ height: 48, borderRadius: 999 }} />
            <div className="skeleton" style={{ height: 200, borderRadius: 20 }} />
          </div>
        ) : customer ? (
          <div className="stack">
            <div className="alert alert-success"><Icon name="check" size={16} /> {customer.name}{customer.email ? ' · ' + customer.email : customer.phone ? ' · ' + customer.phone : ''}</div>
            <ButtonLink href="/shop" size="lg" block>Continue shopping</ButtonLink>
            <Button variant="outline" block onClick={signOut} icon="logout">Sign out</Button>
          </div>
        ) : (
          <div className="stack">
            <div className="segmented segmented-block" role="tablist" aria-label="Account mode">
              <button role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setStep('contact'); setCode(''); clear(); }}>Sign in</button>
              <button role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setStep('contact'); setCode(''); clear(); }}>Sign up</button>
            </div>
            <div className="alert" role="note">
              <Icon name="shield" size={16} /> No password is used. We verify your email address or mobile number with a one-time code.
            </div>
            <form className="stack" onSubmit={submit}>
              {mode === 'signup' && step === 'contact' && (
                <TextField label="Full name" required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
              )}
              {step === 'contact' ? (
                <TextField
                  label="Email address or phone number"
                  required
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="you@example.com or +250 7XX XXX XXX"
                  autoComplete="email"
                  type="text"
                  hint="For Rwanda, use a number such as +250 78 123 4567."
                />
              ) : (
                <>
                  <div className="alert alert-success">Code sent to {contact}. Check your {isEmail ? 'inbox and spam folder' : 'SMS messages'}.</div>
                  <TextField
                    label="One-time verification code"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Enter the code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                  <button type="button" className="link-arrow" onClick={sendCode} disabled={loading}>Send a new code</button>
                </>
              )}
              <Button type="submit" size="lg" block loading={loading}>
                {loading ? 'Please wait…' : step === 'contact' ? 'Send verification code' : 'Verify and sign in'}
              </Button>
              {step === 'verify' && <Button variant="outline" type="button" block onClick={() => { setStep('contact'); setCode(''); clear(); }}>Change email or phone</Button>}
            </form>
          </div>
        )}
        {message && <p className="alert alert-success" style={{ marginTop: 16 }}>{message}</p>}
        {error && <p className="alert alert-error" role="alert" style={{ marginTop: 16 }}>{error}</p>}
        <p className="muted small auth-foot">You can check out as a guest too. <Link href="/seller/login">Seller login</Link></p>
      </div>
    </div>
  );
}
