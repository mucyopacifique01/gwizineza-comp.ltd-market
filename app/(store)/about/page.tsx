import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/config';
import { InfoPage } from '@/components/content/InfoPage';
import { LocationBand } from '@/components/home/LocationBand';
import { Icon, type IconName } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'About' };

const VALUES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'shield', title: 'Trust first', text: 'Sellers are created and approved by the owner. Products are checked before they reach you.' },
  { icon: 'link', title: 'Connected commerce', text: 'We link local businesses with shoppers who need their goods, in one simple place.' },
  { icon: 'receipt', title: 'Clarity', text: 'Clear prices, a clear order number, and a confirmation you can keep or share.' },
  { icon: 'sparkle', title: 'Growth', text: 'Built in Kabarondo to help local sellers reach more customers online.' },
];

export default function AboutPage() {
  return (
    <>
      <InfoPage eyebrow="About us" title="A market that connects." lead={`Gwizineza Market is an online marketplace from ${site.location}, created by ${site.owner}.`}>
        <div className="about-grid">
          <div className="prose">
            <h2>Why we built Gwizineza</h2>
            <p>Shopping for everyday goods should be simple. Gwizineza Market brings trusted local sellers together in one place so customers can browse, compare and order in minutes, whether that’s soap, sugar cane, rice or household essentials.</p>
            <p>Each seller is set up and approved by the Gwizineza team. When you place an order you receive an order number straight away, and our team contacts you to arrange delivery from Kabarondo.</p>
            <p>This is a growing platform. Online payments and official EBM receipts are being prepared so that every purchase is as smooth as it is trustworthy.</p>
            <Link href="/shop" className="btn btn-primary" style={{ marginTop: 12 }}>Start shopping <Icon name="arrowRight" size={16} /></Link>
          </div>
          <div className="value-grid">
            {VALUES.map(v => <div key={v.title} className="value-card"><span className="trust-ico"><Icon name={v.icon} size={20} /></span><h3>{v.title}</h3><p className="muted small">{v.text}</p></div>)}
          </div>
        </div>
        <div className="founder card">
          <span className="seller-avatar big" aria-hidden="true">MP</span>
          <div><span className="eyebrow no-rule">Owner & creator</span><h3>{site.owner}</h3><p className="muted">Founder of Gwizineza Market · {site.location}</p></div>
        </div>
      </InfoPage>
      <LocationBand />
    </>
  );
}
