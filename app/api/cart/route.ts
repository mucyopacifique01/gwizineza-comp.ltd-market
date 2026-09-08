import { db } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cartId = new URL(request.url).searchParams.get('cartId');
  if (!cartId) return Response.json({ error: 'cartId is required' }, { status: 400 });

  const cart = await db.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: { product: true } } },
  });

  if (!cart) return Response.json({ cart: { id: cartId, items: [], subtotalRwf: 0 } });

  const subtotalRwf = cart.items.reduce((sum, item) => sum + item.quantity * item.product.priceRwf, 0);
  return Response.json({ cart: { ...cart, subtotalRwf } });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { cartId, productId, quantity } = body;

  if (!cartId || !productId || !Number.isInteger(quantity) || quantity < 1) {
    return Response.json({ error: 'cartId, productId and a positive integer quantity are required' }, { status: 400 });
  }

  const product = await db.product.findFirst({ where: { id: productId, isActive: true } });
  if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
  if (quantity > product.stock) return Response.json({ error: 'Not enough stock' }, { status: 409 });

  await db.cart.upsert({ where: { id: cartId }, update: {}, create: { id: cartId } });
  const item = await db.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    update: { quantity },
    create: { cartId, productId, quantity },
    include: { product: true },
  });

  return Response.json({ item }, { status: 201 });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const { cartId, productId } = body;
  if (!cartId || !productId) return Response.json({ error: 'cartId and productId are required' }, { status: 400 });

  await db.cartItem.delete({ where: { cartId_productId: { cartId, productId } } });
  return Response.json({ ok: true });
}
