'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { CategoryDTO } from '@/lib/types';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Modal';
import { useCart } from '@/components/providers/CartProvider';
import { SearchOverlay } from './SearchOverlay';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/categories', label: 'Categories' },
  { href: '/sellers', label: 'Sellers' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader({ categories, announcement }: { categories: CategoryDTO[]; announcement?: { enabled: boolean; text: string } }) {
  const pathname = usePathname();
  const { count, bump } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearch(true); }
      if (event.key === '/' && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) { event.preventDefault(); setSearch(true); }
    };
    const open = () => setSearch(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('gz:open-search', open);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('gz:open-search', open); };
  }, []);

  useEffect(() => { setMenu(false); setSearch(false); }, [pathname]);

  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const showAnnouncement = announcement?.enabled !== false;

  return (
    <>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        {showAnnouncement && <div className="announce"><div className="container announce-inner"><span><Icon name="pin" size={14} /> {announcement?.text || 'Serving customers from Kabarondo, Rwanda'}</span><span className="announce-sep" aria-hidden="true" /><span className="hide-sm"><Icon name="receipt" size={14} /> Order confirmation you can share on WhatsApp</span></div></div>}
        <div className="container header-inner">
          <button className="btn btn-ghost btn-icon only-mobile" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <Logo />
          <nav className="main-nav" aria-label="Main">
            {NAV.map(item => <Link key={item.href} href={item.href} className={active(item.href) ? 'is-active' : undefined} aria-current={active(item.href) ? 'page' : undefined}>{item.label}</Link>)}
          </nav>
          <div className="header-actions">
            <button className="search-trigger" onClick={() => setSearch(true)} aria-label="Search products">
              <Icon name="search" size={18} /><span className="hide-md">Search products…</span><kbd className="hide-md">/</kbd>
            </button>
            <Link href="/auth" className="btn btn-ghost btn-icon hide-mobile" aria-label="Customer account"><Icon name="user" /></Link>
            <Link href="/cart" className="btn btn-dark cart-btn" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              <Icon name="bag" size={18} />
              <span className="hide-sm">Cart</span>
              <span key={bump} className={`cart-count${bump ? ' is-bumped' : ''}`}>{count}</span>
            </Link>
          </div>
        </div>
      </header>

      <Sheet open={menu} onClose={() => setMenu(false)} side="left" title="Menu">
        <nav className="drawer-nav" aria-label="Mobile">
          {NAV.map(item => <Link key={item.href} href={item.href} className={active(item.href) ? 'is-active' : undefined}>{item.label}<Icon name="chevronRight" size={18} /></Link>)}
        </nav>
        {categories.length > 0 && <>
          <div className="eyebrow" style={{ marginTop: 28 }}>Categories</div>
          <div className="chip-cloud" style={{ marginTop: 12 }}>{categories.map(c => <Link key={c.id} href={'/shop?category=' + c.slug} className="chip">{c.name}</Link>)}</div>
        </>}
        <div className="drawer-accounts">
          <Link href="/auth" className="btn btn-outline btn-block"><Icon name="user" size={18} /> Customer account</Link>
          <Link href="/seller/login" className="btn btn-ghost btn-block"><Icon name="store" size={18} /> Seller login</Link>
          <Link href="/admin/login" className="btn btn-ghost btn-block btn-sm"><Icon name="lock" size={16} /> Owner access</Link>
        </div>
      </Sheet>

      <SearchOverlay open={search} onClose={() => setSearch(false)} categories={categories} />
    </>
  );
}
