/** Public, non-secret site configuration. Only NEXT_PUBLIC_* values may be read here. */
const digits = (value: string | undefined) => (value ?? '').replace(/\D/g, '');

export const site = {
  name: 'Gwizineza Market',
  shortName: 'Gwizineza',
  owner: 'Mucyo Pacifique',
  location: 'Kabarondo, Rwanda',
  region: 'Kabarondo · Kayonza District · Eastern Province',
  tagline: 'Everyday goods from trusted local sellers, connected in one market.',
  whatsapp: digits(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? '',
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? '',
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL ?? '',
    x: process.env.NEXT_PUBLIC_X_URL ?? '',
  },
  /** Approximate public area pin (town centre). Already published by the previous site. */
  map: { lat: -2.0127, lng: 30.5585 },
  /** When a real EBM integration exists server-side, set NEXT_PUBLIC_EBM_ENABLED=true. */
  ebmEnabled: process.env.NEXT_PUBLIC_EBM_ENABLED === 'true',
};

export const LOW_STOCK_THRESHOLD = 5;
export const SHOP_PAGE_SIZE = 12;
