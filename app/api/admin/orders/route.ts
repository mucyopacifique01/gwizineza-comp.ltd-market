import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    requireAdmin();
    const orders = await db.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return Response.json({ orders });
  } catch (error) {
    return apiErrorResponse('admin/orders', error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin();
    const { id, status } = await request.json();
    if (!id || !['ORDERED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) return Response.json({ error: 'Invalid order status' }, { status: 400 });
    const order = await db.order.update({ where: { id }, data: { status } });
    return Response.json({ order });
  } catch (error) {
    return apiErrorResponse('admin/orders', error);
  }
}
