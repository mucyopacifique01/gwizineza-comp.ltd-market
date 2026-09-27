'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useCart } from '@/components/providers/CartProvider';

export function MobileTabBar() {
  const pathname = usePathname();
  const { count } = useCart();
  const items: { href?: string; label: string; icon: IconName; action?: () => void }[] = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/shop', label: 'Shop', icon: 'grid' },
    { label: 'Search', icon: 'search', action: () => window.dispatchEvent(new Event('gz:open-search')) },
    { href: '/cart', label: 'Cart', icon: 'bag' },
    { href: '/auth', label: 'Account', icon: 'user' },
  ];
  if (pathname.startsWith('/checkout')) return null;
  return (
    <nav className="tabbar" aria-label="Quick navigation">
      {items.map(item => {
        const isActive = item.href ? (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) : false;
        const inner = <><span className="tabbar-icon"><Icon name={item.icon} size={22} />{item.icon === 'bag' && count > 0 && <span className="tabbar-badge">{count}</span>}</span><span>{item.label}</span></>;
        return item.href
          ? <Link key={item.label} href={item.href} className={isActive ? 'is-active' : undefined} aria-current={isActive ? 'page' : undefined}>{inner}</Link>
          : <button key={item.label} type="button" onClick={item.action}>{inner}</button>;
      })}
    </nav>
  );
}
