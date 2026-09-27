import { db } from '@/lib/prisma';
import { requireSeller } from '@/lib/seller-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sellerId = requireSeller();
    const seller = await db.seller.findUnique({ where: { id: sellerId }, select: { status: true } });
    if (!seller || seller.status !== 'APPROVED') return Response.json({ error: 'Seller account is not active' }, { status: 403 });

    const products = await db.product.findMany({
      where: { sellerId },
      include: { category: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json({ products });
  } catch (error) {
    return apiErrorResponse('seller-products', error);
  }
}

export async function POST(request: Request) {
  try {
    const sellerId = requireSeller();
    const seller = await db.seller.findUnique({ where: { id: sellerId }, select: { status: true } });
    if (!seller || seller.status !== 'APPROVED') return Response.json({ error: 'Seller account is not active' }, { status: 403 });

    const body = await request.json();
    const { sku, name, slug, description, priceRwf, stock, imageUrl, categoryId, compareAtPriceRwf } = body;
    if (compareAtPriceRwf != null && (!Number.isInteger(compareAtPriceRwf) || compareAtPriceRwf < 0)) return Response.json({ error: 'Invalid compare-at price' }, { status: 400 });
    if (!sku || !name || !slug || !Number.isInteger(priceRwf) || priceRwf < 0 || !Number.isInteger(stock) || stock < 0) {
      return Response.json({ error: 'sku, name, slug, priceRwf and stock are required' }, { status: 400 });
    }

    const duplicate = await db.product.findFirst({ where: { OR: [{ sku }, { slug }] }, select: { id: true, sku: true, slug: true } });
    if (duplicate) return Response.json({ error: duplicate.sku === sku ? 'SKU already exists' : 'Product slug already exists' }, { status: 409 });

    if (categoryId) {
      const category = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
      if (!category) return Response.json({ error: 'Category not found' }, { status: 404 });
    }

    const product = await db.product.create({
      data: {
        sku,
        name,
        slug,
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        priceRwf,
        stock,
        imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
        categoryId: categoryId || null,
        compareAtPriceRwf: compareAtPriceRwf ?? null,
        sellerId,
        isActive: true,
      },
      include: { category: true, seller: { select: { id: true, businessName: true } }, images: true },
    });
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return apiErrorResponse('seller-products', error);
  }
}

export async function PATCH(request: Request) {
  try {
    const sellerId = requireSeller();
    const body = await request.json();
    const { id, name, slug, description, priceRwf, stock, imageUrl, categoryId, isActive, compareAtPriceRwf } = body;
    if (compareAtPriceRwf != null && (!Number.isInteger(compareAtPriceRwf) || compareAtPriceRwf < 0)) return Response.json({ error: 'Invalid compare-at price' }, { status: 400 });
    if (!id) return Response.json({ error: 'Product id is required' }, { status: 400 });
    const activeSeller = await db.seller.findUnique({ where: { id: sellerId }, select: { status: true } });
    if (!activeSeller || activeSeller.status !== 'APPROVED') return Response.json({ error: 'Seller account is not active' }, { status: 403 });
    if (categoryId) {
      const category = await db.category.findUnique({ where: { id: categoryId }, select: { id: true } });
      if (!category) return Response.json({ error: 'Category not found' }, { status: 404 });
    }

    const existing = await db.product.findFirst({ where: { id, sellerId } });
    if (!existing) return Response.json({ error: 'Product not found for this seller' }, { status: 404 });

    if (priceRwf !== undefined && (!Number.isInteger(priceRwf) || priceRwf < 0)) return Response.json({ error: 'priceRwf must be a non-negative integer' }, { status: 400 });
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) return Response.json({ error: 'stock must be a non-negative integer' }, { status: 400 });

    if (slug && slug !== existing.slug) {
      const duplicate = await db.product.findFirst({ where: { slug, NOT: { id } }, select: { id: true } });
      if (duplicate) return Response.json({ error: 'Product slug already exists' }, { status: 409 });
    }

    const product = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(slug !== undefined ? { slug: String(slug).trim() } : {}),
        ...(description !== undefined ? { description: typeof description === 'string' && description.trim() ? description.trim() : null } : {}),
        ...(priceRwf !== undefined ? { priceRwf } : {}),
        ...(stock !== undefined ? { stock } : {}),
        ...(imageUrl !== undefined ? { imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(compareAtPriceRwf !== undefined ? { compareAtPriceRwf: compareAtPriceRwf ?? null } : {}),
      },
      include: { category: true, seller: { select: { id: true, businessName: true } }, images: true },
    });
    return Response.json({ product });
  } catch (error) {
    return apiErrorResponse('seller-products', error);
  }
}
