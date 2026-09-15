import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  requireAdmin();
  const orders = await db.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' }, take: 100 });
  return Response.json({ orders });
}

export async function PATCH(request: Request) {
  requireAdmin();
  const { id, status } = await request.json();
  if (!id || !['ORDERED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) return Response.json({ error: 'Invalid order status' }, { status: 400 });
  const order = await db.order.update({ where: { id }, data: { status } });
  return Response.json({ order });
}
