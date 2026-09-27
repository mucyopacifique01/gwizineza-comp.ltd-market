import { db } from '@/lib/prisma';
import type { OrderDTO, OrderStatus } from '@/lib/types';

export async function getOrderByNumber(orderNumber: string): Promise<OrderDTO | null> {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: { include: { product: { select: { imageUrl: true, slug: true } } } } },
  });
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    customerName: order.customerName,
    phone: order.phone,
    customerEmail: order.customerEmail ?? null,
    deliveryAddress: order.deliveryAddress,
    subtotalRwf: order.subtotalRwf,
    deliveryRwf: order.deliveryRwf,
    totalRwf: order.totalRwf,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPriceRwf: item.unitPriceRwf,
      quantity: item.quantity,
      lineTotalRwf: item.lineTotalRwf,
      imageUrl: item.product?.imageUrl ?? null,
      slug: item.product?.slug ?? null,
    })),
  };
}
