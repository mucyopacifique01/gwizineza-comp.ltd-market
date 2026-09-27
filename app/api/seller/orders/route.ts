import { db } from '@/lib/prisma';
import { requireSeller } from '@/lib/seller-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * NEW: orders that contain this seller's products. Only the seller's own line items are returned,
 * plus minimal order context (no customer phone numbers).
 */
export async function GET() {
  try {
    const sellerId = requireSeller();
    const seller = await db.seller.findUnique({ where: { id: sellerId }, select: { status: true } });
    if (!seller || seller.status !== 'APPROVED') return Response.json({ error: 'Seller account is not active' }, { status: 403 });

    const items = await db.orderItem.findMany({
      where: { sellerId },
      select: {
        id: true, productId: true, productName: true, unitPriceRwf: true, quantity: true, lineTotalRwf: true,
        order: { select: { id: true, orderNumber: true, status: true, customerName: true, deliveryAddress: true, createdAt: true } },
      },
      take: 500,
    });

    const map = new Map<string, { id: string; orderNumber: string; status: string; customerName: string; deliveryArea: string; createdAt: string; totalRwf: number; items: { id: string; productId: string; productName: string; unitPriceRwf: number; quantity: number; lineTotalRwf: number }[] }>();
    for (const item of items) {
      const o = item.order;
      const entry = map.get(o.id) ?? { id: o.id, orderNumber: o.orderNumber, status: o.status, customerName: o.customerName.split(' ')[0] ?? o.customerName, deliveryArea: o.deliveryAddress.split(',').slice(-2).join(',').trim(), createdAt: o.createdAt.toISOString(), totalRwf: 0, items: [] };
      entry.items.push({ id: item.id, productId: item.productId, productName: item.productName, unitPriceRwf: item.unitPriceRwf, quantity: item.quantity, lineTotalRwf: item.lineTotalRwf });
      entry.totalRwf += item.lineTotalRwf;
      map.set(o.id, entry);
    }
    const orders = Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const revenueRwf = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalRwf, 0);
    const unitsSold = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.items.reduce((n, i) => n + i.quantity, 0), 0);
    return Response.json({ orders, summary: { orderCount: orders.length, revenueRwf, unitsSold } });
  } catch (error) {
    return apiErrorResponse('seller/orders', error);
  }
}
