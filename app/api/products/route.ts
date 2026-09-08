import { db } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const q = url.searchParams.get('q');

  const products = await db.product.findMany({
    where: {
      isActive: true,
      ...(category ? { category: { slug: category } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ products });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { sku, name, slug, description, priceRwf, stock, imageUrl, categoryId } = body;

  if (!sku || !name || !slug || !Number.isInteger(priceRwf) || priceRwf < 0 || !Number.isInteger(stock) || stock < 0) {
    return Response.json({ error: 'sku, name, slug, priceRwf and stock are required' }, { status: 400 });
  }

  const product = await db.product.create({
    data: { sku, name, slug, description, priceRwf, stock, imageUrl, categoryId },
  });

  return Response.json({ product }, { status: 201 });
}
