import type { OrderDTO } from '@/lib/types';

const API_BASE = (process.env.DJANGO_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export async function getOrderByNumber(orderNumber: string): Promise<OrderDTO | null> {
  try {
    const response = await fetch(API_BASE + '/api/orders/' + encodeURIComponent(orderNumber), { cache: 'no-store' });
    if (!response.ok) return null;
    const result = await response.json() as { order?: OrderDTO };
    return result.order || null;
  } catch {
    return null;
  }
}
