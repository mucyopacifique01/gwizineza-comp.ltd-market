'use client';

import { useState, type FormEvent } from 'react';
import { site } from '@/lib/config';
import { TextField, TextAreaField, SelectField } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/**
 * Sends the message to the marketplace team through the support-ticket API
 * (the owner reads them in Admin → Support tickets). Falls back to a
 * WhatsApp/email hand-off when the API is unreachable, if a contact is configured.
 */
export function ContactForm() {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('An order');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const text = `Hello Gwizineza Market, my name is ${name || '…'}.\nTopic: ${topic}\n${email || phone ? `Reply to: ${email || phone}\n` : ''}\n${message}`;
  const canWhatsApp = Boolean(site.whatsapp);
  const canEmail = Boolean(site.email);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError('');
    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `${topic} — ${name || 'Customer'}`,
          message: text,
          email: email || undefined,
          phone: phone || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Your message could not be delivered.');
      setState('sent');
    } catch (err) {
      // Backend unreachable: offer a direct hand-off when a contact is configured.
      if (canWhatsApp || canEmail) {
        const url = canWhatsApp
          ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`
          : `mailto:${site.email}?subject=${encodeURIComponent(`Gwizineza: ${topic}`)}&body=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        setState('sent');
        return;
      }
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'We could not reach Gwizineza Market. Check your connection and try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <form className="card stack" onSubmit={e => { e.preventDefault(); setState('idle'); setMessage(''); }}>
        <span className="icon-round" style={{ background: 'var(--teal, #10d8a5)', color: '#0f1923' }}><Icon name="check" size={22} /></span>
        <h2 className="card-title" style={{ marginBottom: 0 }}>Message sent</h2>
        <p className="muted small">Thank you{`${name ? `, ${name}` : ''}`}! The Gwizineza team received your message and will reply{`${email ? ` to ${email}` : phone ? ` to ${phone}` : ' soon'}`}.</p>
        <Button type="submit" variant="outline">Send another message</Button>
      </form>
    );
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2 className="card-title" style={{ marginBottom: 0 }}>Send us a message</h2>
      <TextField label="Your name" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
      <SelectField label="Topic" value={topic} onChange={e => setTopic(e.target.value)}>
        {['An order', 'A product', 'Selling on Gwizineza', 'Something else'].map(t => <option key={t}>{t}</option>)}
      </SelectField>
      <div className="grid-2">
        <TextField label="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" />
        <TextField label="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" />
      </div>
      <TextAreaField label="Message" value={message} onChange={e => setMessage(e.target.value)} required rows={5} />
      {state === 'error' && <p className="alert alert-warn" role="alert">{error}</p>}
      <Button type="submit" variant="primary" icon="mail" size="lg" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </Button>
      <p className="muted tiny">Your message goes straight to the Gwizineza team. Add an email or phone number so we can reply.</p>
    </form>
  );
}
