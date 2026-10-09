import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';
import { ensureStarterCatalog, getProducts, productSelect, toProductDTO } from '@/lib/catalog';
import type { SortKey } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SORTS: SortKey[] = ['featured', 'newest', 'price-asc', 'price-desc', 'name'];
const num = (value: string | null) => (value && /^\d+$/.test(value) ? Number(value) : null);

/**
 * Public product listing (unchanged contract: returns { products }).
 * New optional filters: seller, ids, minPrice, maxPrice, inStock=1, featured=1, sort, page, pageSize.
 * When page/pageSize is supplied the response also includes total/page/pageSize.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const admin = url.searchParams.get('admin') === 'true';
    if (admin) requireAdmin();
    else await ensureStarterCatalog();

    const sort = url.searchParams.get('sort') as SortKey | null;
    const result = await getProducts({
      admin,
      q: url.searchParams.get('q')?.trim() || null,
      category: url.searchParams.get('category'),
      seller: url.searchParams.get('seller'),
      ids: url.searchParams.has('ids') ? (url.searchParams.get('ids') ?? '').split(',').filter(Boolean).slice(0, 60) : undefined,
      minPrice: num(url.searchParams.get('minPrice')),
      maxPrice: num(url.searchParams.get('maxPrice')),
      inStock: url.searchParams.get('inStock') === '1',
      featured: url.searchParams.get('featured') === '1',
      sort: sort && SORTS.includes(sort) ? sort : 'newest',
      page: num(url.searchParams.get('page')),
      pageSize: num(url.searchParams.get('pageSize')),
    });
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse('products', error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin();
    const body = await request.json();
    const { sku, name, slug, description, priceRwf, stock, imageUrl, categoryId, sellerId, compareAtPriceRwf } = body;
    if (!sku || !name || !slug || !Number.isInteger(priceRwf) || priceRwf < 0 || !Number.isInteger(stock) || stock < 0) {
      return Response.json({ error: 'sku, name, slug, priceRwf and stock are required' }, { status: 400 });
    }
    if (compareAtPriceRwf != null && (!Number.isInteger(compareAtPriceRwf) || compareAtPriceRwf < 0)) {
      return Response.json({ error: 'Invalid compare-at price' }, { status: 400 });
    }
    if (sellerId) {
      const seller = await db.seller.findUnique({ where: { id: sellerId } });
      if (!seller || seller.status !== 'APPROVED') return Response.json({ error: 'Seller must be approved before receiving products' }, { status: 409 });
    }
    const product = await db.product.create({
      data: { sku, name, slug, description: description || null, priceRwf, stock, imageUrl: imageUrl || null, categoryId: categoryId || null, sellerId: sellerId || null, compareAtPriceRwf: compareAtPriceRwf ?? null },
      select: productSelect,
    });
    return Response.json({ product: toProductDTO(product) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse('products', error);
  }
}
