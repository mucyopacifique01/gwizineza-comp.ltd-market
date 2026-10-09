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
  { href: '/shop', label: 'Products' },
  { href: '/categories', label: 'Categories' },
  { href: '/sellers', label: 'Suppliers' },
  { href: '/deals', label: 'Deals' },
  { href: '/trade-assurance', label: 'Trade Assurance' },
];

export function SiteHeader({ categories, announcement }: { categories: CategoryDTO[]; announcement?: { enabled: boolean; text: string } }) {
  const pathname = usePathname();
  const { count, bump } = useCart();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => { setMenu(false); setSearch(false); }, [pathname]);
  useEffect(() => {
    const openSearch = () => setSearch(true);
    window.addEventListener('gz:open-search', openSearch);
    return () => window.removeEventListener('gz:open-search', openSearch);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSearch(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const active = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return <>
    <header className="site-header">
      {announcement?.enabled && announcement.text.trim() && (
        <div className="fig-announcement"><div className="container">{announcement.text.trim()}</div></div>
      )}
      <div className="fig-topbar">
        <div className="container fig-topbar-inner">
          <div className="fig-top-links"><span>24/7 Customer Service</span><span>Trade Assurance</span><span>Inspection Service</span></div>
          <div className="fig-top-links"><span>English</span><span>RWF</span><Link href="/account">My Gwizineza</Link><Link href="/help">Sourcing Solutions</Link><Link href="/contact">Service & Membership</Link></div>
        </div>
      </div>

      <div className="container fig-navbar">
        <div className="fig-brand"><Logo /><span className="fig-brand-copy"><strong>Gwizineza</strong><small>B2B MARKETPLACE</small></span></div>
        <div className="fig-search-desktop">
          <button type="button" onClick={() => setSearch(true)} aria-label="Search products, suppliers, and categories"><Icon name="search" size={18}/><span>Search products, suppliers, and categories</span><b>Search</b></button>
        </div>
        <div className="fig-nav-actions">
          <Link href="/contact" className="fig-btn fig-btn-outline fig-hide-mobile">Post Buying Request (RFQ)</Link>
          <Link href="/auth" className="fig-btn fig-btn-primary fig-hide-mobile">Join Free</Link>
          <button className="fig-icon-btn fig-only-mobile" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu" size={22}/></button>
          <Link href="/cart" className="fig-icon-btn fig-cart-btn" aria-label={`Cart, ${count} items`}><Icon name="bag" size={21}/><span key={bump}>{count}</span></Link>
        </div>
      </div>

      <div className="container fig-mobile-search">
        <button type="button" onClick={() => setSearch(true)} aria-label="Open search"><Icon name="search" size={18}/><span>Search products, suppliers, and categories</span></button>
      </div>

      <div className="fig-category-nav">
        <div className="container fig-category-inner">
          <Link href="/categories" className="is-all">All Categories</Link>
          {categories.slice(0, 7).map(c => <Link key={c.id} href={`/shop?category=${c.slug}`} className={active(`/shop?category=${c.slug}`) ? 'is-active' : undefined}>{c.name}</Link>)}
          <Link href="/deals">Deals & Promotions</Link>
        </div>
      </div>
    </header>

    <Sheet open={menu} onClose={() => setMenu(false)} side="left" title="Gwizineza Marketplace">
      <nav className="drawer-nav">{NAV.map(item => <Link key={item.href} href={item.href}>{item.label}<Icon name="chevronRight" size={18}/></Link>)}</nav>
      <div className="drawer-accounts">
        <Link href="/auth" className="btn btn-outline btn-block">Customer account</Link>
        <Link href="/seller/login" className="btn btn-primary btn-block">Sell on Gwizineza</Link>
        <Link href="/admin/login" className="btn btn-ghost btn-block">Owner access</Link>
      </div>
    </Sheet>
    <SearchOverlay open={search} onClose={() => setSearch(false)} categories={categories}/>
  </>;
}