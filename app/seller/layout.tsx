'use client';

import { usePathname } from 'next/navigation';
import { DashShell, type DashNavItem } from '@/components/dash/DashShell';
import { SellerProvider, useSeller } from '@/components/dash/SellerContext';
import { initials } from '@/lib/format';

const NAV: DashNavItem[] = [
  { href: '/seller', label: 'Dashboard', icon: 'chart', exact: true },
  { href: '/seller/products', label: 'My products', icon: 'box' },
  { href: '/seller/orders', label: 'Orders', icon: 'receipt' },
  { href: '/seller/profile', label: 'Profile', icon: 'user' },
];

function Identity() {
  const { seller } = useSeller();
  if (!seller) return null;
  return <div className="dash-identity"><span className="seller-avatar">{initials(seller.businessName)}</span><div><strong>{seller.businessName}</strong><small>{seller.ownerName}</small></div></div>;
}

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/seller/login') return <>{children}</>;
  return (
    <SellerProvider>
      <DashShell
        area="Seller"
        nav={NAV}
        identity={<Identity />}
        onLogout={async () => { await fetch('/api/seller/auth/logout', { method: 'POST' }); window.location.href = '/seller/login'; }}
      >
        {children}
      </DashShell>
    </SellerProvider>
  );
}
