import { db } from '@/lib/prisma';

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
} as const;

export type SiteSettingsDTO = typeof DEFAULT_SITE_SETTINGS & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function getSiteSettings(): Promise<SiteSettingsDTO> {
  try {
    const row = await db.siteSettings.findUnique({ where: { key: 'site' } });
    if (!row) return DEFAULT_SITE_SETTINGS;
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...row,
      phone: row.phone ?? '',
      email: row.email ?? '',
      whatsapp: row.whatsapp ?? '',
      announcementText: row.announcementText ?? '',
      mapLat: row.mapLat ?? DEFAULT_SITE_SETTINGS.mapLat,
      mapLng: row.mapLng ?? DEFAULT_SITE_SETTINGS.mapLng,
      copyrightYear: row.copyrightYear || DEFAULT_SITE_SETTINGS.copyrightYear,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('[site-settings] read failed', error);
    return DEFAULT_SITE_SETTINGS;
  }
}
