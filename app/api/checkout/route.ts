import { randomUUID } from 'crypto';
import { db } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function makeOrderNumber() {
  return `GW-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { cartId, customerName, phone, deliveryAddress } = body;

  if (!cartId || !customerName || !phone || !deliveryAddress) {
    return Response.json({ error: 'cartId, customerName, phone and deliveryAddress are required' }, { status: 400 });
  }

  const order = await db.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { id: cartId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) throw new Error('CART_EMPTY');

    const subtotalRwf = cart.items.reduce((sum, item) => sum + item.quantity * item.product.priceRwf, 0);
    const deliveryRwf = 0;
    const totalRwf = subtotalRwf + deliveryRwf;

    for (const item of cart.items) {
      const result = await tx.product.updateMany({
        where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count !== 1) throw new Error(`OUT_OF_STOCK:${item.product.name}`);
    }

    const created = await tx.order.create({
      data: {
        orderNumber: makeOrderNumber(),
        customerName,
        phone,
        deliveryAddress,
        subtotalRwf,
        deliveryRwf,
        totalRwf,
        currency: 'RWF',
        status: 'ORDERED',
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            sellerId: item.product.sellerId,
            productName: item.product.name,
            unitPriceRwf: item.product.priceRwf,
            quantity: item.quantity,
            lineTotalRwf: item.quantity * item.product.priceRwf,
          })),
        },
      },
      include: { items: true },
    });

    await tx.cartItem.deleteMany({ where: { cartId } });
    return created;
  }).catch((error: Error) => {
    if (error.message === 'CART_EMPTY') return null;
    throw error;
  });

  if (!order) return Response.json({ error: 'Cart is empty' }, { status: 400 });

  return Response.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalRwf: order.totalRwf,
      currency: order.currency,
      phone: order.phone,
      items: order.items,
    },
  }, { status: 201 });
}
