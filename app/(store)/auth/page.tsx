'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { TextField } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/brand/Logo';

type Channel = 'email' | 'phone';
type Customer = { id: string; name: string; email: string | null; phone: string | null; avatarUrl?: string | null };

function normalizeRwandaPhone(value: string) {
  const trimmed = value.trim().replace(/[\s().-]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('250')) return '+' + trimmed;
  if (trimmed.startsWith('0')) return '+250' + trimmed.slice(1);
  if (/^7\d{8}$/.test(trimmed)) return '+250' + trimmed;
  return trimmed;
}

export default function AuthPage() {
  const [channel, setChannel] = useState<Channel>('phone');
  const [mode, setMode] = useState<'send' | 'verify'>('send');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient(url, key) : null;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError('Authentication is not configured yet. Add the Supabase URL and anon key to the frontend environment.');
      setChecking(false);
      return;
    }
    fetch('/api/customer/me')
      .then(response => response.ok ? response.json() : null)
      .then(data => setCustomer(data?.customer ?? null))
      .catch(() => setCustomer(null))
      .finally(() => setChecking(false));
  }, [supabase]);

  function clearMessages() {
    setMessage('');
    setError('');
  }

  async function sendOtp(event: FormEvent) {
    event.preventDefault();
    clearMessages();
    if (!supabase) {
      setError('Supabase Auth is not configured yet.');
      return;
    }
    const normalized = channel === 'email' ? contact.trim().toLowerCase() : normalizeRwandaPhone(contact);
    if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Enter a valid email address.');
      return;
    }
    if (channel === 'phone' && !/^\+?[1-9]\d{8,14}$/.test(normalized)) {
      setError('Enter a valid phone number, for example +250 78 123 4567.');
      return;
    }
    if (mode === 'send' && !contact.trim()) {
      setError(channel === 'email' ? 'Enter your email address.' : 'Enter your phone number.');
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = channel === 'email'
        ? await supabase.auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: true, data: { full_name: name.trim() } } })
        : await supabase.auth.signInWithOtp({ phone: normalized, options: { shouldCreateUser: true, data: { full_name: name.trim() } } });
      if (authError) throw authError;
      setContact(normalized);
      setMode('verify');
      setMessage('A one-time code was sent to ' + normalized + '. It expires shortly; do not share it with anyone.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send the one-time code. Check the contact and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    clearMessages();
    if (!supabase) return;
    setLoading(true);
    try {
      const { error: authError } = channel === 'email'
        ? await supabase.auth.signInWithOtp({ email: contact, options: { shouldCreateUser: true, data: { full_name: name.trim() } } })
        : await supabase.auth.signInWithOtp({ phone: contact, options: { shouldCreateUser: true, data: { full_name: name.trim() } } });
      if (authError) throw authError;
      setMessage('A new code was sent to ' + contact + '.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send a new code.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    clearMessages();
    if (!supabase) {
      setError('Supabase Auth is not configured yet.');
      return;
    }
    const code = otp.trim();
    if (!/^\d{6,8}$/.test(code)) {
      setError('Enter the one-time code from your message.');
      return;
    }
    setLoading(true);
    try {
      const verification = channel === 'email'
        ? await supabase.auth.verifyOtp({ email: contact, token: code, type: 'email' })
        : await supabase.auth.verifyOtp({ phone: contact, token: code, type: 'sms' });
      if (verification.error) throw verification.error;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const displayName = name.trim() || String(userData.user.user_metadata?.full_name ?? '');
      if (displayName) await supabase.auth.updateUser({ data: { full_name: displayName } });
      const response = await fetch('/api/customer/me', { cache: 'no-store' });
      const profile = response.ok ? await response.json() : null;
      setCustomer(profile?.customer ?? {
        id: userData.user.id,
        name: displayName || (channel === 'email' ? contact.split('@')[0] : 'Gwizineza customer'),
        email: userData.user.email ?? null,
        phone: userData.user.phone ?? null,
      });
      setMessage('Your OTP was verified. You are signed in.');
      setOtp('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The code could not be verified. Request another code and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    clearMessages();
    if (supabase) await supabase.auth.signOut();
    setCustomer(null);
    setMode('send');
    setOtp('');
    setMessage('You have signed out.');
  }

  return (
    <div className="container auth-page fig-auth-page">
      <div className="auth-card card">
        <div className="auth-head">
          <LogoMark size={44} />
          <h1>{customer ? 'Hi, ' + (customer.name.split(' ')[0] || 'there') : mode === 'verify' ? 'Enter your one-time code' : 'Sign in or create an account'}</h1>
          <p className="muted">{customer ? 'Your account is secured with a verified one-time code.' : 'No password. Use a one-time code sent to your email or mobile phone.'}</p>
        </div>
        {checking ? (
          <div className="stack" aria-busy="true"><div className="skeleton" style={{ height: 48, borderRadius: 999 }} /><div className="skeleton" style={{ height: 200, borderRadius: 20 }} /></div>
        ) : customer ? (
          <div className="stack">
            <div className="alert alert-success"><Icon name="check" size={16} /> {customer.name}{customer.email ? ' · ' + customer.email : customer.phone ? ' · ' + customer.phone : ''}</div>
            <Button size="lg" block onClick={() => { window.location.href = '/shop'; }}>Continue shopping</Button>
            <Button variant="outline" block onClick={signOut} icon="logout">Sign out</Button>
          </div>
        ) : (
          <div className="stack">
            {mode === 'send' ? (
              <>
                <div className="segmented segmented-block" role="tablist" aria-label="OTP delivery method">
                  <button type="button" role="tab" aria-selected={channel === 'phone'} onClick={() => { setChannel('phone'); clearMessages(); }}>Phone OTP</button>
                  <button type="button" role="tab" aria-selected={channel === 'email'} onClick={() => { setChannel('email'); clearMessages(); }}>Email OTP</button>
                </div>
                <form className="stack" onSubmit={sendOtp}>
                  <TextField label="Full name (optional)" value={name} onChange={event => setName(event.target.value)} placeholder="Your name" autoComplete="name" />
                  <TextField label={channel === 'email' ? 'Email address' : 'Phone number'} required value={contact} onChange={event => setContact(event.target.value)} placeholder={channel === 'email' ? 'you@example.com' : '+250 78 123 4567'} autoComplete={channel === 'email' ? 'email' : 'tel'} />
                  <Button type="submit" size="lg" block disabled={loading || !supabase}>{loading ? 'Sending code…' : 'Send one-time code'}</Button>
                </form>
              </>
            ) : (
              <form className="stack" onSubmit={verifyOtp}>
                <p className="muted small">Code sent to <strong>{contact}</strong>.</p>
                <TextField label="One-time code" required value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="123456" autoComplete="one-time-code" />
                <Button type="submit" size="lg" block disabled={loading || !supabase}>{loading ? 'Verifying…' : 'Verify and sign in'}</Button>
                <Button variant="outline" type="button" block disabled={loading} onClick={() => { setMode('send'); setOtp(''); clearMessages(); }}>Use a different contact</Button>
                <Button variant="ghost" type="button" block disabled={loading} onClick={resendOtp}>Send a new code</Button>
              </form>
            )}
            {message && <div className="alert alert-success" role="status"><Icon name="check" size={16} /> {message}</div>}
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <p className="muted small">By continuing, you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
          </div>
        )}
      </div>
    </div>
  );
}
