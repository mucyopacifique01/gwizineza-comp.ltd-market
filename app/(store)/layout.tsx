import { getCategories } from '@/lib/catalog';
import { getSiteSettings } from '@/lib/site-settings';
import type { CategoryDTO } from '@/lib/types';
import { StoreProviders } from '@/components/providers/Providers';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MobileTabBar } from '@/components/layout/MobileTabBar';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let categories: CategoryDTO[] = [];
  try { categories = await getCategories(); } catch (error) { console.error('[store-layout] categories unavailable', error); }
  const settings = await getSiteSettings();

  return <StoreProviders>
    <div className="figma-store-theme">
      <a href="#main" className="skip-link">Skip to content</a>
      <SiteHeader categories={categories} announcement={{ enabled: settings.announcementEnabled, text: settings.announcementText || settings.location }} />
      <main id="main" className="store-main">{children}</main>
      <SiteFooter categories={categories} />
      <MobileTabBar />
    </div>
  </StoreProviders>;
}