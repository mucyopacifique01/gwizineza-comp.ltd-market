'use client';

import { FormEvent, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus('');
    setError(false);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'We could not subscribe you right now. Please try again.');
      }
      setStatus(result.message || 'You are subscribed to Gwizineza Market updates.');
      setEmail('');
    } catch (err) {
      setError(true);
      setStatus(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="newsletter-signup" aria-labelledby="newsletter-title">
      <div className="newsletter-copy">
        <span className="eyebrow no-rule">GWIZINEZA MARKET</span>
        <h3 id="newsletter-title">Market updates in your inbox</h3>
        <p>Get news about new products, special offers and market updates.</p>
      </div>
      <form className="newsletter-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="newsletter-email">Email address</label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
          required
          disabled={loading}
        />
        <button type="submit" className="btn btn-sun" disabled={loading}>
          {loading ? 'Subscribing…' : 'Subscribe'}
          {!loading && <Icon name="arrowRight" size={17} />}
        </button>
      </form>
      <p className={'newsletter-status' + (error ? ' is-error' : '')} aria-live="polite">
        {status || 'Subscribe to receive updates by email. You can unsubscribe by contacting us.'}
      </p>
    </section>
  );
}
