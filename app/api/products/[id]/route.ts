import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';
import { getProductBySlug, productSelect, toProductDTO } from '@/lib/catalog';
import { DISPLAY_SECTIONS } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public single product by id or slug (added for product detail / quick view). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const product = await getProductBySlug(params.id);
    if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
    return Response.json({ product });
  } catch (error) {
    return apiErrorResponse('products/[id]', error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    requireAdmin();
    const body = await request.json();
    const allowed = ['sku', 'name', 'slug', 'description', 'priceRwf', 'stock', 'imageUrl', 'categoryId', 'sellerId', 'isActive', 'compareAtPriceRwf', 'isFeatured', 'displaySection', 'displayPriority'] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) if (body[key] !== undefined) data[key] = body[key];
    if (data.priceRwf !== undefined && (!Number.isInteger(data.priceRwf) || Number(data.priceRwf) < 0)) return Response.json({ error: 'Invalid price' }, { status: 400 });
    if (data.stock !== undefined && (!Number.isInteger(data.stock) || Number(data.stock) < 0)) return Response.json({ error: 'Invalid stock' }, { status: 400 });
    if (data.compareAtPriceRwf !== undefined && data.compareAtPriceRwf !== null && (!Number.isInteger(data.compareAtPriceRwf) || Number(data.compareAtPriceRwf) < 0)) return Response.json({ error: 'Invalid compare-at price' }, { status: 400 });
    if (data.displayPriority !== undefined && data.displayPriority !== null && !Number.isInteger(data.displayPriority)) return Response.json({ error: 'Invalid display priority' }, { status: 400 });
    if (data.isFeatured !== undefined && data.isFeatured !== null && typeof data.isFeatured !== 'boolean') return Response.json({ error: 'Invalid featured flag' }, { status: 400 });
    if (data.displaySection === '') data.displaySection = null;
    if (data.displaySection != null && !(DISPLAY_SECTIONS as readonly string[]).includes(String(data.displaySection))) return Response.json({ error: 'Invalid display section' }, { status: 400 });
    if (data.categoryId === '') data.categoryId = null;
    if (data.sellerId === '') data.sellerId = null;
    if (data.sellerId) {
      const seller = await db.seller.findUnique({ where: { id: String(data.sellerId) } });
      if (!seller || seller.status !== 'APPROVED') return Response.json({ error: 'Seller must be approved' }, { status: 409 });
    }
    try {
      const product = await db.product.update({ where: { id: params.id }, data: data as never, select: productSelect });
      return Response.json({ product: toProductDTO(product) });
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
