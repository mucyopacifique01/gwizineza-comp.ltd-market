import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const q = url.searchParams.get('q');
  const admin = url.searchParams.get('admin') === 'true';
  if (admin) requireAdmin();

  const products = await db.product.findMany({
    where: {
      ...(admin ? {} : { isActive: true, OR: [{ sellerId: null }, { seller: { status: 'APPROVED' } }] }),
      ...(category ? { category: { slug: category } } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    include: { category: true, seller: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } },
    orderBy: { createdAt: 'desc' },
  });
  return Response.json({ products });
}

export async function POST(request: Request) {
  requireAdmin();
  const body = await request.json();
  const { sku, name, slug, description, priceRwf, stock, imageUrl, categoryId, sellerId } = body;
  if (!sku || !name || !slug || !Number.isInteger(priceRwf) || priceRwf < 0 || !Number.isInteger(stock) || stock < 0) {
    return Response.json({ error: 'sku, name, slug, priceRwf and stock are required' }, { status: 400 });
  }
  if (sellerId) {
    const seller = await db.seller.findUnique({ where: { id: sellerId } });
    if (!seller || seller.status !== 'APPROVED') return Response.json({ error: 'Seller must be approved before receiving products' }, { status: 409 });
  }
  const product = await db.product.create({ data: { sku, name, slug, description: description || null, priceRwf, stock, imageUrl: imageUrl || null, categoryId: categoryId || null, sellerId: sellerId || null }, include: { seller: true, category: true, images: true } });
  return Response.json({ product }, { status: 201 });
}
