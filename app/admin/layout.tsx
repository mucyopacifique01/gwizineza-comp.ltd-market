'use client';

import { usePathname } from 'next/navigation';
import { DashShell, type DashNavItem } from '@/components/dash/DashShell';

const NAV: DashNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'chart', exact: true },
  { href: '/admin/orders', label: 'Orders', icon: 'receipt' },
  { href: '/admin/products', label: 'Products & inventory', icon: 'box' },
  { href: '/admin/sellers', label: 'Sellers', icon: 'store' },
  { href: '/admin/customers', label: 'Users', icon: 'users' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/admin/finance', label: 'Finance', icon: 'money' },
  { href: '/admin/content', label: 'CMS', icon: 'layers' },
  { href: '/admin/support', label: 'Support tickets', icon: 'users' },
  { href: '/admin/settings', label: 'Settings', icon: 'settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return <>{children}</>;
  return <DashShell area="Owner" nav={NAV} identity={<div className="dash-identity"><span className="seller-avatar">MP</span><div><strong>Owner</strong><small>Gwizineza Market</small></div></div>} onLogout={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }}>{children}</DashShell>;
}
