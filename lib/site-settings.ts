const API_BASE = (process.env.DJANGO_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const DEFAULT_SITE_SETTINGS_BASE = {
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

export const DEFAULT_SITE_SETTINGS = DEFAULT_SITE_SETTINGS_BASE;

export type SiteSettingsDTO = typeof DEFAULT_SITE_SETTINGS_BASE & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function getSiteSettings(): Promise<SiteSettingsDTO> {
  try {
    const response = await fetch(API_BASE + '/api/site/settings', { cache: 'no-store' });
    if (!response.ok) return DEFAULT_SITE_SETTINGS;
    const result = await response.json() as { settings?: Partial<SiteSettingsDTO> };
    return { ...DEFAULT_SITE_SETTINGS, ...(result.settings || {}) };
  } catch (error) {
    console.error('[site-settings] Django API unavailable', error);
    return DEFAULT_SITE_SETTINGS;
  }
}

export type HeroSlideDTO = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  linkUrl: string;
  linkLabel: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
};

export async function getHeroSlides(): Promise<HeroSlideDTO[]> {
  try {
    const response = await fetch(API_BASE + '/api/site/slides', { cache: 'no-store' });
    if (!response.ok) return [];
    const result = await response.json() as { slides?: HeroSlideDTO[] };
    return Array.isArray(result.slides) ? result.slides : [];
  } catch (error) {
    console.error('[site-settings] slides unavailable', error);
    return [];
  }
}

export type LogoDTO = { logo: string; logo_light: string };
export const DEFAULT_LOGO: LogoDTO = { logo: '/brand/logo-mark-on-dark.png', logo_light: '/brand/logo-mark-on-light.png' };

export async function getLogo(): Promise<LogoDTO> {
  try {
    const response = await fetch(API_BASE + '/api/site/logo', { cache: 'no-store' });
    if (!response.ok) return DEFAULT_LOGO;
    const result = await response.json() as { logo?: Partial<LogoDTO> };
    return { ...DEFAULT_LOGO, ...(result.logo || {}) };
  } catch {
    return DEFAULT_LOGO;
  }
}
