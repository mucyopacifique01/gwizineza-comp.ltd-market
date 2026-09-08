import { db } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { orderNumber: string } }) {
  const order = await db.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { items: true },
  });

  if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

  return Response.json({ order });
}
