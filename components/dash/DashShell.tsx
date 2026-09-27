'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/brand/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ToastProvider } from '@/components/ui/Toast';

export type DashNavItem = { href: string; label: string; icon: IconName; exact?: boolean };

export function DashShell({ area, nav, onLogout, identity, children }: { area: 'Owner' | 'Seller'; nav: DashNavItem[]; onLogout: () => Promise<void>; identity?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const isActive = (item: DashNavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const sidebar = (
    <>
      <div className="dash-brand">
        <LogoMark size={34} />
        <div><strong>GWIZINEZA</strong><small>{area} console</small></div>
      </div>
      <nav className="dash-nav" aria-label={`${area} navigation`}>
        {nav.map(item => (
          <Link key={item.href} href={item.href} className={isActive(item) ? 'is-active' : undefined} aria-current={isActive(item) ? 'page' : undefined}>
            <Icon name={item.icon} size={18} /> {item.label}
          </Link>
        ))}
      </nav>
      <div className="dash-foot">
        {identity}
        <Link href="/" className="dash-link"><Icon name="store" size={16} /> View storefront</Link>
        <button className="dash-link" disabled={leaving} onClick={async () => { setLeaving(true); await onLogout(); }}><Icon name="logout" size={16} /> {leaving ? 'Signing out…' : 'Sign out'}</button>
      </div>
    </>
  );

  return (
    <ToastProvider>
      <div className="dash">
        <aside className="dash-sidebar">{sidebar}</aside>
        <div className="dash-topbar">
          <button className="btn btn-ghost btn-icon" onClick={() => setOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="row"><LogoMark size={28} /><strong className="small">{area} console</strong></div>
          <span style={{ width: 44 }} />
        </div>
        {open && <><div className="overlay" onClick={() => setOpen(false)} aria-hidden="true" /><aside className="dash-sidebar dash-sidebar-mobile" role="dialog" aria-modal="true" aria-label="Navigation">{sidebar}</aside></>}
        <main className="dash-main" id="main">{children}</main>
      </div>
    </ToastProvider>
  );
}

export function DashHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="dash-header">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>
      {actions && <div className="row wrap">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, icon, hint, tone = 'neutral' }: { label: string; value: ReactNode; icon: IconName; hint?: ReactNode; tone?: 'neutral' | 'green' | 'sun' | 'sky' | 'clay' }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="row-between"><span className="stat-label">{label}</span><span className="stat-icon"><Icon name={icon} size={18} /></span></div>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
