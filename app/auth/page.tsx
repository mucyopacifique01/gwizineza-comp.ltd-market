'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup';
type Method = 'email' | 'phone';

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

  useEffect(() => {
    try {
      const supabase = getSupabase();
      supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? data.user?.phone ?? null));
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email ?? session?.user?.phone ?? null);
      });
      return () => listener.subscription.unsubscribe();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication is not configured.');
      return undefined;
    }
  }, []);

  function clearFeedback() {
    setMessage('');
    setError('');
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault(); clearFeedback(); setLoading(true);
    try {
      const supabase = getSupabase();
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(data.session ? 'Account created and you are signed in.' : 'Account created. Check your email and confirm your email address before signing in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('You are signed in.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Authentication failed.'); }
    finally { setLoading(false); }
  }

  async function sendPhoneOtp(event: FormEvent) {
    event.preventDefault(); clearFeedback(); setLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
      if (error) throw error;
      setOtpSent(true); setMessage('OTP sent to your phone. Enter the code you received.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send OTP.'); }
    finally { setLoading(false); }
  }

  async function verifyPhoneOtp(event: FormEvent) {
    event.preventDefault(); clearFeedback(); setLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
      if (error) throw error;
      setMessage('Phone verified and you are signed in.'); setOtpSent(false); setOtp('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Invalid OTP.'); }
    finally { setLoading(false); }
  }

  async function google() {
    clearFeedback(); setLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth` } });
      if (error) throw error;
    } catch (e) { setError(e instanceof Error ? e.message : 'Google sign-in failed.'); setLoading(false); }
  }

  async function signOut() {
    try {
      const supabase = getSupabase(); await supabase.auth.signOut(); setMessage('You have signed out.'); setUserEmail(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign out.'); }
  }

  return (
    <main className="admin-page"><div className="admin-shell" style={{ maxWidth: 620 }}>
      <header className="admin-header"><div><div className="eyebrow">Gwizineza Market</div><h1>{userEmail ? 'Your account' : mode === 'signin' ? 'Sign in' : 'Create account'}</h1><p className="muted">Use Google, email, or your mobile phone with OTP.</p></div><a className="btn btn-secondary" href="/">← Store</a></header>
      {userEmail ? <section className="admin-card"><h2>You are signed in</h2><p className="muted">Account: {userEmail}</p><div className="actions"><a className="btn btn-primary" href="/shop">Continue shopping</a><button className="btn btn-secondary" onClick={signOut}>Sign out</button></div></section> : <>
        <section className="admin-card"><div className="actions"><button className={`btn ${mode === 'signin' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('signin'); clearFeedback(); }}>Sign in</button><button className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('signup'); clearFeedback(); }}>Sign up</button></div><button className="btn btn-secondary" style={{ width: '100%', marginTop: 18 }} onClick={google} disabled={loading}>Continue with Google</button></section>
        <section className="admin-card"><div className="actions"><button className={`btn ${method === 'email' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMethod('email'); clearFeedback(); }}>Email</button><button className={`btn ${method === 'phone' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMethod('phone'); clearFeedback(); }}>Mobile phone + OTP</button></div>
          {method === 'email' ? <form className="form" onSubmit={submitEmail}><label>Email address</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /><label>Password</label><input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /><button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Please wait...' : mode === 'signup' ? 'Create account with email' : 'Sign in with email'}</button></form> : !otpSent ? <form className="form" onSubmit={sendPhoneOtp}><label>Mobile phone number</label><input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+250 7XX XXX XXX" autoComplete="tel" /><p className="muted">Use the international format, for example +250 7XX XXX XXX.</p><button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Sending OTP...' : 'Send OTP'}</button></form> : <form className="form" onSubmit={verifyPhoneOtp}><label>OTP code</label><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" autoComplete="one-time-code" /><button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</button><button type="button" className="btn btn-secondary" onClick={() => setOtpSent(false)}>Use a different number</button></form>}
          {message && <p className="note">{message}</p>}{error && <p className="note" role="alert">{error}</p>}
        </section>
      </>}
    </div></main>
  );
}
