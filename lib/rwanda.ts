export const RWANDA_DISTRICTS = [
  'Kayonza', 'Bugesera', 'Gatsibo', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana',
  'Gasabo', 'Kicukiro', 'Nyarugenge',
  'Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo',
  'Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango',
  'Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro',
] as const;

export function normalizeRwPhone(value: string) {
  return value.replace(/[\s-]/g, '');
}

export function isValidRwPhone(value: string) {
  return /^(\+?250|0)?7\d{8}$/.test(normalizeRwPhone(value));
}

/** Converts a local number to international digits for wa.me links: 0781234567 -> 250781234567 */
export function toWhatsAppDigits(value: string) {
  const d = normalizeRwPhone(value).replace(/^\+/, '');
  if (d.startsWith('250')) return d;
  if (d.startsWith('0')) return `250${d.slice(1)}`;
  if (d.startsWith('7')) return `250${d}`;
  return d;
}
