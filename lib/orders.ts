import type { OrderDTO, OrderStatus } from '@/lib/types';

const API_BASE = (process.env.DJANGO_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export async function getOrderByNumber(orderNumber: string): Promise<OrderDTO | null> {
  const response = await fetch(API_BASE + '/api/orders/' + encodeURIComponent(orderNumber), { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Django order API returned ' + response.status);
  const data = await response.json() as { order: OrderDTO };
  return data.order ? { ...data.order, status: data.order.status as OrderStatus } : null;
}
