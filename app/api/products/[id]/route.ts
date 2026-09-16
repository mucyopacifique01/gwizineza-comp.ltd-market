import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    requireAdmin();
    const body = await request.json();
    const allowed = ['sku', 'name', 'slug', 'description', 'priceRwf', 'stock', 'imageUrl', 'categoryId', 'sellerId', 'isActive'] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) if (body[key] !== undefined) data[key] = body[key];
    if (data.priceRwf !== undefined && (!Number.isInteger(data.priceRwf) || Number(data.priceRwf) < 0)) return Response.json({ error: 'Invalid price' }, { status: 400 });
    if (data.stock !== undefined && (!Number.isInteger(data.stock) || Number(data.stock) < 0)) return Response.json({ error: 'Invalid stock' }, { status: 400 });
    if (data.categoryId === '') data.categoryId = null;
    if (data.sellerId === '') data.sellerId = null;
    if (data.sellerId) {
      const seller = await db.seller.findUnique({ where: { id: String(data.sellerId) } });
      if (!seller || seller.status !== 'APPROVED') return Response.json({ error: 'Seller must be approved' }, { status: 409 });
    }
    try {
      const product = await db.product.update({ where: { id: params.id }, data: data as never, include: { category: true, seller: true, images: true } });
      return Response.json({ product });
    } catch (error) {
      // Only translate record-not-found into 404; surface everything else.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return Response.json({ error: 'Product not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse('products/[id]', error);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    requireAdmin();
    try {
      await db.product.update({ where: { id: params.id }, data: { isActive: false } });
      return Response.json({ ok: true });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return Response.json({ error: 'Product not found' }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    return apiErrorResponse('products/[id]', error);
  }
}
