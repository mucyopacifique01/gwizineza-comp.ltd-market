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

export function SiteHeader({ categories }: { categories: CategoryDTO[]; announcement?: { enabled: boolean; text: string } }) {
  const pathname = usePathname();
  const { count, bump } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  useEffect(() => { const onScroll=()=>setScrolled(window.scrollY>8); onScroll(); window.addEventListener('scroll',onScroll,{passive:true}); return()=>window.removeEventListener('scroll',onScroll); }, []);
  useEffect(() => {
    const onKey=(e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearch(true)}
      if(e.key==='/'&&!(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)){e.preventDefault();setSearch(true)}
    };
    const open=()=>setSearch(true);
    window.addEventListener('keydown',onKey); window.addEventListener('gz:open-search',open);
    return()=>{window.removeEventListener('keydown',onKey);window.removeEventListener('gz:open-search',open)};
  }, []);
  useEffect(()=>{setMenu(false);setSearch(false)},[pathname]);
  const active=(href:string)=>href==='/'?pathname==='/':pathname.startsWith(href);

  return <>
    <header className={`site-header${scrolled?' is-scrolled':''}`}>
      <div className="announce">
        <div className="container announce-inner">
          <div className="row"><span>24/7 Customer Service</span><span className="announce-sep"/><span className="hide-sm">Trade Assurance</span><span className="hide-sm">Inspection Service</span></div>
          <div className="row hide-sm"><span>English</span><span>RWF</span><Link href="/account">My Gwizineza</Link><Link href="/help">Help Center</Link></div>
        </div>
      </div>
      <div className="container header-inner">
        <button className="btn btn-ghost btn-icon only-mobile" onClick={()=>setMenu(true)} aria-label="Open menu"><Icon name="menu"/></button>
        <Logo/>
        <nav className="main-nav" aria-label="Main">{NAV.map(item=><Link key={item.href} href={item.href} className={active(item.href)?'is-active':undefined}>{item.label}</Link>)}</nav>
        <div className="header-actions">
          <button className="search-trigger" onClick={()=>setSearch(true)} aria-label="Search products"><Icon name="search" size={18}/><span>Search products, suppliers, and categories</span><kbd className="hide-sm">⌘K</kbd></button>
          <Link href="/seller/login" className="btn btn-outline hide-mobile">Sell on Gwizineza</Link>
          <Link href="/auth" className="btn btn-ghost btn-icon hide-mobile" aria-label="Customer account"><Icon name="user"/></Link>
          <Link href="/cart" className="btn btn-dark cart-btn" aria-label={`Cart, ${count} items`}><Icon name="bag" size={18}/><span className="hide-sm">Cart</span><span key={bump} className="cart-count">{count}</span></Link>
        </div>
      </div>
      <div className="container fig-category-nav">
        <Link href="/categories" className="fig-cat-all">All Categories</Link>
        {categories.slice(0,7).map(c=><Link key={c.id} href={`/shop?category=${c.slug}`}>{c.name}</Link>)}
        <Link href="/deals">Deals & Promotions</Link>
      </div>
    </header>
    <Sheet open={menu} onClose={()=>setMenu(false)} side="left" title="Gwizineza Marketplace">
      <nav className="drawer-nav">{NAV.map(item=><Link key={item.href} href={item.href}>{item.label}<Icon name="chevronRight" size={18}/></Link>)}</nav>
      <div className="drawer-accounts"><Link href="/auth" className="btn btn-outline btn-block">Customer account</Link><Link href="/seller/login" className="btn btn-primary btn-block">Sell on Gwizineza</Link><Link href="/admin/login" className="btn btn-ghost btn-block">Owner access</Link></div>
    </Sheet>
    <SearchOverlay open={search} onClose={()=>setSearch(false)} categories={categories}/>
  </>;
}