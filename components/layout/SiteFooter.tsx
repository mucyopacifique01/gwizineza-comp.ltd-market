import Link from 'next/link';
import type { CategoryDTO } from '@/lib/types';
import { site } from '@/lib/config';
import { getSiteSettings } from '@/lib/site-settings';
import { Logo } from '@/components/brand/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';

export async function SiteFooter({ categories }: { categories: CategoryDTO[] }) {
  const settings = await getSiteSettings();
  const whatsapp = settings.whatsapp?.replace(/\D/g, '') || site.whatsapp;
  const phone = settings.phone || site.phone;
  const email = settings.email || site.email;
  const socials = ([
    ['instagram', site.social.instagram, 'Instagram'],
    ['facebook', site.social.facebook, 'Facebook'],
    ['tiktok', site.social.tiktok, 'TikTok'],
    ['xlogo', site.social.x, 'X'],
  ] as [IconName, string, string][]).filter(([, url]) => url);

  return <footer className="site-footer">
    <div className="container">
      <div className="footer-cta">
        <div><span className="eyebrow no-rule">GWIZINEZA MARKET</span><h2>Source smarter. Buy with confidence.</h2><p>{settings.tagline || 'A connected B2B marketplace for trusted buyers and sellers.'}</p></div>
        <div className="row wrap">
          <Link href="/shop" className="btn btn-sun btn-lg">Shop now <Icon name="arrowRight" size={18}/></Link>
          {whatsapp && <a href={'https://wa.me/' + whatsapp} className="btn btn-outline btn-lg footer-outline" target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18}/> WhatsApp</a>}
        </div>
      </div>
      <div className="footer-grid">
        <div className="footer-brand"><Logo light/><p>Trusted marketplace from {settings.location || site.location}, Rwanda.</p><p className="footer-loc"><Icon name="pin" size={15}/> {settings.location || site.location}</p></div>
        <nav><h3>Marketplace</h3><Link href="/shop">Products</Link><Link href="/categories">Categories</Link><Link href="/sellers">Suppliers</Link><Link href="/deals">Deals</Link></nav>
        <nav><h3>Services</h3><Link href="/trade-assurance">Trade Assurance</Link><Link href="/shipping">Shipping & Logistics</Link><Link href="/help">Help Center</Link><Link href="/blog">Market News</Link></nav>
        <nav><h3>Company</h3><Link href="/about">About us</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
        <div><h3>Contact</h3>{phone && <a className="footer-link" href={'tel:' + phone.replace(/\s/g,'')}><Icon name="phone" size={15}/> {phone}</a>}{email && <a className="footer-link" href={'mailto:' + email}><Icon name="mail" size={15}/> {email}</a>}{whatsapp && <a className="footer-link" href={'https://wa.me/' + whatsapp}><Icon name="whatsapp" size={15}/> WhatsApp</a>}{socials.length > 0 && <div className="row" style={{marginTop:14}}>{socials.map(([icon,url,label]) => <a key={label} className="social" href={url} aria-label={label} target="_blank" rel="noopener noreferrer"><Icon name={icon} size={16}/></a>)}</div>}</div>
      </div>
      <div className="footer-bottom"><span>© {settings.copyrightYear} {settings.copyrightText} · {settings.location}</span><span>{settings.footerCredit}</span></div>
    </div>
  </footer>;
}