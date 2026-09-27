import type { Metadata } from 'next';
import { site } from '@/lib/config';
import { InfoPage } from '@/components/content/InfoPage';
import { LocationBand } from '@/components/home/LocationBand';
import { ContactForm } from '@/components/content/ContactForm';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  const channels = [
    site.whatsapp && { icon: 'whatsapp' as const, label: 'WhatsApp', value: 'Chat with us', href: `https://wa.me/${site.whatsapp}` },
    site.phone && { icon: 'phone' as const, label: 'Phone', value: site.phone, href: `tel:${site.phone.replace(/\s/g, '')}` },
    site.email && { icon: 'mail' as const, label: 'Email', value: site.email, href: `mailto:${site.email}` },
    { icon: 'pin' as const, label: 'Location', value: site.location, href: '' },
  ].filter(Boolean) as { icon: 'whatsapp' | 'phone' | 'mail' | 'pin'; label: string; value: string; href: string }[];

  return (
    <>
      <InfoPage eyebrow="Contact" title="Let’s talk." lead="Questions about an order, a product, or selling on Gwizineza Market? We’re here to help.">
        <div className="contact-grid">
          <div className="stack">
            {channels.map(c => {
              const inner = <><span className="trust-ico"><Icon name={c.icon} size={20} /></span><span><small className="muted">{c.label}</small><strong>{c.value}</strong></span></>;
              return c.href ? <a key={c.label} href={c.href} className="contact-channel" target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{inner}</a> : <div key={c.label} className="contact-channel">{inner}</div>;
            })}
          </div>
          <ContactForm />
        </div>
      </InfoPage>
      <LocationBand />
    </>
  );
}
