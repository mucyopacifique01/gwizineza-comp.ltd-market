import { db } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { orderNumber: string } }) {
  try {
    const order = await db.order.findUnique({
      where: { orderNumber: params.orderNumber },
      include: { items: true },
    });

    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    return Response.json({ order });
  } catch (error) {
    return apiErrorResponse('orders/[orderNumber]', error);
  }
}
