export function formatRwf(value: number) {
  return `${Math.round(value).toLocaleString('en-US')} RWF`;
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price || compareAt <= 0) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function formatDate(value: string | Date, withTime = false) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  ORDERED: 'Order received',
  PROCESSING: 'Being prepared',
  SHIPPED: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function stockState(stock: number, low = 5): 'out' | 'low' | 'in' {
  if (stock <= 0) return 'out';
  if (stock <= low) return 'low';
  return 'in';
}
