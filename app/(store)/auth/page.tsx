'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { TextField } from '@/components/ui/Field';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/brand/Logo';

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

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
  const [googleLoading, setGoogleLoading] = useState(false);

  async function finishGoogleLogin(accessToken: string) {
    try {
      const response = await fetch('/api/customer/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Google sign-in could not be completed.');
      setCustomer(data.customer);
      setMessage('You are signed in with Google.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in could not be completed.');
    } finally {
      setGoogleLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token') || params.get('access_token');
    const oauthError = params.get('error_description') || params.get('error') || hash.get('error_description') || hash.get('error');
    if (accessToken) {
      window.history.replaceState({}, '', window.location.pathname); // strip tokens from the URL immediately
      setGoogleLoading(true);
      void finishGoogleLogin(accessToken);
    } else if (oauthError) {
      window.history.replaceState({}, '', window.location.pathname);
      const lowered = oauthError.toLowerCase();
      setError(lowered.includes('not enabled')
        ? 'Google sign-in is not set up for the store yet. Use an email or phone code instead.'
        : 'Google sign-in did not complete: ' + oauthError.replace(/\+/g, ' ').slice(0, 160));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function signInWithGoogle() {
    clear();
    setGoogleLoading(true);
    try {
      const response = await fetch('/api/auth/config');
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.supabaseUrl) throw new Error(data.error || 'Google sign-in is not available right now.');
      const redirect = encodeURIComponent(window.location.origin + '/auth');
      window.location.href = data.supabaseUrl + '/auth/v1/authorize?provider=google&redirect_to=' + redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in is not available right now.');
      setGoogleLoading(false);
    }
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
            {step === 'contact' && (
              <>
                <Button variant="outline" size="lg" block loading={googleLoading} onClick={signInWithGoogle}>
                  <GoogleG /> {googleLoading ? 'Signing in…' : 'Continue with Google'}
                </Button>
                <div className="auth-divider"><span>or use a one-time code</span></div>
              </>
            )}
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
