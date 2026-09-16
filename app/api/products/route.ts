import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const starterProducts = [
  { sku: 'DOV-001', name: 'Dove Go Fresh Beauty Bar', slug: 'dove-go-fresh-beauty-bar', priceRwf: 320, stock: 50, category: 'Personal Care', imageUrl: '/products/dove-soap.jpg' },
  { sku: 'RIC-001', name: 'Rice 10kg', slug: 'rice-10kg', priceRwf: 12000, stock: 30, category: 'Groceries', imageUrl: '/products/rice-10kg.jpg' },
  { sku: 'RIC-002', name: 'Rice Bag', slug: 'rice-bag', priceRwf: 29500, stock: 30, category: 'Groceries', imageUrl: '/products/rice-bag.jpg' },
  { sku: 'SUG-001', name: 'Sugar Cane', slug: 'sugar-cane', priceRwf: 55000, stock: 40, category: 'Groceries', imageUrl: '/products/sugar.jpg' },
  { sku: 'OIL-001', name: 'Oil', slug: 'oil', priceRwf: 4800, stock: 0, category: 'Groceries', imageUrl: null },
  { sku: 'STR-001', name: 'Oil Strainer', slug: 'oil-strainer', priceRwf: 8000, stock: 0, category: 'Home & Kitchen', imageUrl: null },
  { sku: 'SPK-001', name: 'Spark Plug', slug: 'spark-plug', priceRwf: 800, stock: 0, category: 'Automotive', imageUrl: null },
  { sku: 'UMB-001', name: 'Umbrella', slug: 'umbrella', priceRwf: 2800, stock: 0, category: 'Accessories', imageUrl: null },
  { sku: 'FLA-001', name: 'Flashlight', slug: 'flashlight', priceRwf: 3000, stock: 0, category: 'Home & Kitchen', imageUrl: null },
  { sku: 'UND-001', name: 'Underwear', slug: 'underwear', priceRwf: 4900, stock: 0, category: 'Clothing', imageUrl: null },
  { sku: 'SOC-001', name: 'Socks', slug: 'socks', priceRwf: 6000, stock: 0, category: 'Clothing', imageUrl: null },
  { sku: 'BRU-001', name: 'Brush', slug: 'brush', priceRwf: 2000, stock: 0, category: 'Personal Care', imageUrl: null },
  { sku: 'NOT-001', name: 'Notebooks', slug: 'notebooks', priceRwf: 3000, stock: 0, category: 'Stationery', imageUrl: null },
  { sku: 'REG-001', name: 'Register', slug: 'register', priceRwf: 6500, stock: 0, category: 'Stationery', imageUrl: null },
  { sku: 'STR-002', name: 'Straw', slug: 'straw', priceRwf: 3000, stock: 0, category: 'Home & Kitchen', imageUrl: null },
] as const;

async function ensureStarterCatalog() {
  const existing = await db.product.count();
  if (existing > 0) return;

  for (const item of starterProducts) {
    const category = await db.category.upsert({
      where: { slug: item.category.toLowerCase() },
      update: { name: item.category },
      create: { name: item.category, slug: item.category.toLowerCase() },
    });

    await db.product.upsert({
      where: { sku: item.sku },
      update: {},
      create: {
        sku: item.sku,
        name: item.name,
        slug: item.slug,
        priceRwf: item.priceRwf,
        stock: item.stock,
        imageUrl: item.imageUrl,
        categoryId: category.id,
        isActive: true,
      },
    });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const q = url.searchParams.get('q');
    const admin = url.searchParams.get('admin') === 'true';
    if (admin) requireAdmin();

    if (!admin) await ensureStarterCatalog();

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
  } catch (error) {
    return apiErrorResponse('products', error);
  }
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    return apiErrorResponse('products', error);
  }
}
