'use client';

import { useState, type FormEvent } from 'react';

export function FigmaNewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus('');
    setError(false);
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Subscription failed. Please try again later.');
      setStatus(result.message || 'Thanks — your email subscription was received.');
      setEmail('');
    } catch (cause) {
      setError(true);
      setStatus(cause instanceof Error ? cause.message : 'Subscription failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="fig-newsletter-form" onSubmit={submit}>
        <label className="sr-only" htmlFor="fig-newsletter-email">Business email</label>
        <input
          id="fig-newsletter-email"
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          maxLength={254}
          placeholder="Business email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
          disabled={loading}
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {status && <p className={error ? 'fig-newsletter-status is-error' : 'fig-newsletter-status'} role={error ? 'alert' : 'status'}>{status}</p>}
    </>
  );
}
