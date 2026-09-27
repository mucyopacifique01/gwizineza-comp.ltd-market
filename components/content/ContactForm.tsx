'use client';

import { useState, type FormEvent } from 'react';
import { site } from '@/lib/config';
import { TextField, TextAreaField, SelectField } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

/**
 * There is no contact-message API in the backend, so this composes a WhatsApp or email message
 * that the customer sends themselves. Nothing is stored or "sent" silently.
 */
export function ContactForm() {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('An order');
  const [message, setMessage] = useState('');
  const text = `Hello Gwizineza Market, my name is ${name || '…'}.\nTopic: ${topic}\n\n${message}`;
  const canWhatsApp = Boolean(site.whatsapp);
  const canEmail = Boolean(site.email);

  function submit(e: FormEvent) {
    e.preventDefault();
    const url = canWhatsApp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}` : `mailto:${site.email}?subject=${encodeURIComponent(`Gwizineza: ${topic}`)}&body=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2 className="card-title" style={{ marginBottom: 0 }}>Send us a message</h2>
      <TextField label="Your name" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
      <SelectField label="Topic" value={topic} onChange={e => setTopic(e.target.value)}>
        {['An order', 'A product', 'Selling on Gwizineza', 'Something else'].map(t => <option key={t}>{t}</option>)}
      </SelectField>
      <TextAreaField label="Message" value={message} onChange={e => setMessage(e.target.value)} required rows={5} />
      {canWhatsApp || canEmail
        ? <Button type="submit" variant={canWhatsApp ? 'whatsapp' : 'primary'} icon={canWhatsApp ? 'whatsapp' : 'mail'} size="lg">{canWhatsApp ? 'Continue in WhatsApp' : 'Open email'}</Button>
        : <p className="alert alert-warn">Contact details are being set up. Please check back soon.</p>}
      <p className="muted tiny">This opens {canWhatsApp ? 'WhatsApp' : 'your email app'} with your message ready to send.</p>
    </form>
  );
}
