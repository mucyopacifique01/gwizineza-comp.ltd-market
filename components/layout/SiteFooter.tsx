import Link from 'next/link';
import type { CategoryDTO } from '@/lib/types';
import { site } from '@/lib/config';
import { getSiteSettings } from '@/lib/site-settings';
import { Logo } from '@/components/brand/Logo';
import { Hills } from '@/components/brand/Motifs';
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

  return (
    <footer className="site-footer">
      <Hills className="footer-hills" tone="rgba(245,240,230,.08)" />
      <div className="container">
        <div className="footer-cta">
          <div>
            <h2>Everything you need, <span className="ink-sun">connected.</span></h2>
            <p>Shop trusted local sellers. Get a clear order confirmation you can keep and share.</p>
          </div>
          <div className="row wrap">
            <Link href="/shop" className="btn btn-sun btn-lg">Start shopping <Icon name="arrowRight" size={18} /></Link>
            {whatsapp && <a href={'https://wa.me/' + whatsapp} className="btn btn-outline btn-lg footer-outline" target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> WhatsApp us</a>}
          </div>
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <Logo light />
            <p>{settings.tagline}</p>
            <p className="footer-loc"><Icon name="pin" size={16} /> {settings.location}</p>
            {socials.length > 0 && <div className="row" style={{ marginTop: 16 }}>{socials.map(([icon, url, label]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="social" aria-label={label}><Icon name={icon} size={18} /></a>)}</div>}
          </div>
          <nav aria-label="Marketplace">
            <h3>Marketplace</h3>
            <Link href="/shop">Shop</Link>
            <Link href="/categories">Categories</Link>
            <Link href="/sellers">Sellers</Link>
            <Link href="/cart">Cart</Link>
          </nav>
          <nav aria-label="Categories">
            <h3>Categories</h3>
            {categories.slice(0, 5).map(c => <Link key={c.id} href={'/shop?category=' + c.slug}>{c.name}</Link>)}
            {categories.length === 0 && <Link href="/categories">Browse all</Link>}
          </nav>
          <nav aria-label="Company">
            <h3>Company</h3>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/help">Help</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
          <div>
            <h3>Visit & contact</h3>
            <p className="footer-text">{settings.region}</p>
            {phone && <a href={'tel:' + phone.replace(/\s/g, '')} className="footer-link"><Icon name="phone" size={16} /> {phone}</a>}
            {email && <a href={'mailto:' + email} className="footer-link"><Icon name="mail" size={16} /> {email}</a>}
            {whatsapp && <a href={'https://wa.me/' + whatsapp} target="_blank" rel="noopener noreferrer" className="footer-link"><Icon name="whatsapp" size={16} /> WhatsApp</a>}
            <div className="footer-portals">
              <Link href="/seller/login">Seller login</Link>
              <Link href="/admin/login">Owner access</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {settings.copyrightYear} {settings.copyrightText} · {settings.location}</span>
          <span>{settings.footerCredit}</span>
        </div>
      </div>
    </footer>
  );
}
