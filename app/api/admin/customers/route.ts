import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** NEW: customers derived from orders (there is no Customer model yet), grouped by phone. */
export async function GET() {
  try {
    requireAdmin();
    const orders = await db.order.findMany({
      select: { phone: true, customerName: true, customerEmail: true, deliveryAddress: true, totalRwf: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    const map = new Map<string, { phone: string; name: string; email: string | null; lastAddress: string; orders: number; spentRwf: number; lastOrderAt: string }>();
    for (const order of orders) {
      const entry = map.get(order.phone);
      if (!entry) {
        map.set(order.phone, { phone: order.phone, name: order.customerName, email: order.customerEmail ?? null, lastAddress: order.deliveryAddress, orders: 1, spentRwf: order.status === 'CANCELLED' ? 0 : order.totalRwf, lastOrderAt: order.createdAt.toISOString() });
      } else {
        entry.orders += 1;
        if (order.status !== 'CANCELLED') entry.spentRwf += order.totalRwf;
        if (!entry.email && order.customerEmail) entry.email = order.customerEmail;
      }
    }
    return Response.json({ customers: Array.from(map.values()) });
  } catch (error) {
    return apiErrorResponse('admin/customers', error);
  }
}
