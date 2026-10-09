const API_BASE = (process.env.DJANGO_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export const DEFAULT_SITE_SETTINGS = {
  key: 'site',
  siteName: 'Gwizineza Market',
  tagline: 'Everyday goods from trusted local sellers, connected in one market.',
  location: 'Kabarondo, Rwanda',
  region: 'Kabarondo · Kayonza District · Eastern Province',
  phone: '',
  email: '',
  whatsapp: '',
  copyrightText: 'Gwizineza Market',
  copyrightYear: new Date().getFullYear(),
  footerCredit: 'Created by Mucyo Pacifique',
  announcementText: 'Serving customers from Kabarondo, Rwanda',
  announcementEnabled: true,
  mapLat: -2.0127,
  mapLng: 30.5585,
};

export type SiteSettingsDTO = typeof DEFAULT_SITE_SETTINGS & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function getSiteSettings(): Promise<SiteSettingsDTO> {
  try {
    const response = await fetch(API_BASE + '/api/site-settings', { cache: 'no-store' });
    if (!response.ok) return DEFAULT_SITE_SETTINGS;
    const data = await response.json() as { settings?: Partial<SiteSettingsDTO> };
    return { ...DEFAULT_SITE_SETTINGS, ...(data.settings ?? {}) };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}
