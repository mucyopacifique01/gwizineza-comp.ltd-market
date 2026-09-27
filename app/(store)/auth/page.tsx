'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { TextField } from '@/components/ui/Field';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/brand/Logo';

type Mode = 'signin' | 'signup';
type Method = 'email' | 'phone';

/** Customer account (existing Supabase Auth flows: Google, email+password, phone OTP). Logic unchanged; UI redesigned. */
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [method, setMethod] = useState<Method>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      const supabase = getSupabase();
      supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? data.user?.phone ?? null)).finally(() => setChecking(false));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user?.email ?? session?.user?.phone ?? null));
      return () => listener.subscription.unsubscribe();
    } catch {
      setError('Customer accounts are not available right now. You can still shop and check out without an account.');
      setChecking(false);
      return undefined;
    }
  }, []);

  const clear = () => { setMessage(''); setError(''); };
  const friendly = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

  async function submitEmail(event: FormEvent) {
    event.preventDefault(); clear(); setLoading(true);
    try {
      const supabase = getSupabase();
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(data.session ? 'Account created and you are signed in.' : 'Account created. Check your email to confirm your address, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('You are signed in.');
      }
    } catch (e) { setError(friendly(e, 'Authentication failed.')); } finally { setLoading(false); }
  }

  async function sendPhoneOtp(event: FormEvent) {
    event.preventDefault(); clear(); setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
      if (error) throw error;
      setOtpSent(true); setMessage('We sent a 6-digit code to your phone.');
    } catch (e) { setError(friendly(e, 'Could not send the code.')); } finally { setLoading(false); }
  }

  async function verifyPhoneOtp(event: FormEvent) {
    event.preventDefault(); clear(); setLoading(true);
    try {
      const { error } = await getSupabase().auth.verifyOtp({ phone, token: otp, type: 'sms' });
      if (error) throw error;
      setMessage('Phone verified. You are signed in.'); setOtpSent(false); setOtp('');
    } catch (e) { setError(friendly(e, 'That code is not valid.')); } finally { setLoading(false); }
  }

  async function google() {
    clear(); setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth` } });
      if (error) throw error;
    } catch (e) { setError(friendly(e, 'Google sign-in failed.')); setLoading(false); }
  }

  async function signOut() {
    try { await getSupabase().auth.signOut(); setMessage('You have signed out.'); setUserEmail(null); } catch (e) { setError(friendly(e, 'Could not sign out.')); }
  }

  return (
    <div className="container auth-page">
      <div className="auth-card card">
        <div className="auth-head"><LogoMark size={44} /><h1>{userEmail ? 'Your account' : mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1><p className="muted">{userEmail ? 'Signed in to Gwizineza Market.' : 'Sign in with Google, email, or your phone.'}</p></div>

        {checking ? <div className="stack" aria-busy="true"><div className="skeleton" style={{ height: 48, borderRadius: 999 }} /><div className="skeleton" style={{ height: 200, borderRadius: 20 }} /></div>
          : userEmail ? (
            <div className="stack">
              <div className="alert alert-success"><Icon name="check" size={16} /> {userEmail}</div>
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
                Continue with Google
              </Button>
              <div className="or"><span>or</span></div>
              <div className="segmented segmented-block" role="tablist" aria-label="Sign-in method">
                <button role="tab" aria-selected={method === 'email'} onClick={() => { setMethod('email'); clear(); }}><Icon name="mail" size={16} /> Email</button>
                <button role="tab" aria-selected={method === 'phone'} onClick={() => { setMethod('phone'); clear(); }}><Icon name="phone" size={16} /> Phone</button>
              </div>
              {method === 'email' ? (
                <form className="stack" onSubmit={submitEmail}>
                  <TextField label="Email address" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                  <TextField label="Password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                  <Button type="submit" size="lg" block loading={loading}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Button>
                </form>
              ) : !otpSent ? (
                <form className="stack" onSubmit={sendPhoneOtp}>
                  <TextField label="Mobile number" type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+250 7XX XXX XXX" autoComplete="tel" hint="Use the international format: +250…" />
                  <Button type="submit" size="lg" block loading={loading}>Send code</Button>
                </form>
              ) : (
                <form className="stack" onSubmit={verifyPhoneOtp}>
                  <TextField label="6-digit code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" autoComplete="one-time-code" />
                  <Button type="submit" size="lg" block loading={loading}>Verify</Button>
                  <Button variant="ghost" block onClick={() => setOtpSent(false)}>Use a different number</Button>
                </form>
              )}
            </div>
          )}
        {message && <p className="alert alert-success" style={{ marginTop: 16 }}>{message}</p>}
        {error && <p className="alert alert-error" role="alert" style={{ marginTop: 16 }}>{error}</p>}
        <p className="muted small auth-foot">Shopping as a guest works too: an account is not required to check out. <Link href="/seller/login">Seller login</Link></p>
      </div>
    </div>
  );
}
