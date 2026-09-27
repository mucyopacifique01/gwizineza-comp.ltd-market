import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** NEW: aggregate numbers for the owner dashboard (real totals, not the 100-order page). */
export async function GET() {
  try {
    requireAdmin();
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 13);

    const [salesAgg, orderCount, productCount, activeProducts, sellerGroups, customerGroups, recentOrders, recentProducts, lowStock, windowOrders, sellerActivity] = await Promise.all([
      db.order.aggregate({ _sum: { totalRwf: true }, where: { status: { not: 'CANCELLED' } } }),
      db.order.count(),
      db.product.count(),
      db.product.count({ where: { isActive: true } }),
      db.seller.groupBy({ by: ['status'], _count: { _all: true } }),
      db.order.groupBy({ by: ['phone'], _count: { _all: true } }),
      db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, orderNumber: true, customerName: true, totalRwf: true, status: true, createdAt: true } }),
      db.product.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, slug: true, priceRwf: true, stock: true, imageUrl: true, isActive: true, createdAt: true, seller: { select: { businessName: true } } } }),
      db.product.findMany({ where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } }, orderBy: { stock: 'asc' }, take: 8, select: { id: true, name: true, stock: true, imageUrl: true, seller: { select: { businessName: true } } } }),
      db.order.findMany({ where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } }, select: { createdAt: true, totalRwf: true } }),
      db.seller.findMany({ orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, businessName: true, status: true, updatedAt: true, _count: { select: { products: true } } } }),
    ]);

    const days: { date: string; totalRwf: number; orders: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(since); d.setDate(since.getDate() + i);
      days.push({ date: d.toISOString().slice(0, 10), totalRwf: 0, orders: 0 });
    }
    for (const order of windowOrders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const day = days.find(entry => entry.date === key);
      if (day) { day.totalRwf += order.totalRwf; day.orders += 1; }
    }

    const sellers = { PENDING: 0, APPROVED: 0, SUSPENDED: 0 } as Record<string, number>;
    for (const group of sellerGroups) sellers[group.status] = group._count._all;

    return Response.json({
      totals: {
        salesRwf: salesAgg._sum.totalRwf ?? 0,
        orders: orderCount,
        products: productCount,
        activeProducts,
        sellers: sellers.PENDING + sellers.APPROVED + sellers.SUSPENDED,
        pendingSellers: sellers.PENDING,
        customers: customerGroups.length,
      },
      sellers,
      salesByDay: days,
      recentOrders: recentOrders.map(o => ({ ...o, createdAt: o.createdAt.toISOString() })),
      recentProducts: recentProducts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
      lowStock,
      sellerActivity: sellerActivity.map(s => ({ ...s, updatedAt: s.updatedAt.toISOString() })),
    });
  } catch (error) {
    return apiErrorResponse('admin/stats', error);
  }
}
