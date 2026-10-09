/**
 * Server-only catalog data layer. Used by server components AND by /api/products,
 * so the storefront and the public API share one query path with safe field selection
 * (seller password hashes / usernames / phones are never selected for public reads).
 */
import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import type { CategoryDTO, ProductDTO, SortKey } from '@/lib/types';

export const safeSellerSelect = { id: true, businessName: true, address: true } as const;

export const productSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  sku: true,
  name: true,
  slug: true,
  description: true,
  priceRwf: true,
  compareAtPriceRwf: true,
  stock: true,
  imageUrl: true,
  isActive: true,
  isFeatured: true,
  displaySection: true,
  displayPriority: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  seller: { select: safeSellerSelect },
  images: {
    select: { id: true, url: true, altText: true, isPrimary: true, sortOrder: true },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
  },
});

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

export function toProductDTO(row: ProductRow): ProductDTO {
  return {
    ...row,
    compareAtPriceRwf: row.compareAtPriceRwf ?? null,
    isFeatured: row.isFeatured ?? null,
    displaySection: row.displaySection ?? null,
    displayPriority: row.displayPriority ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Visible to customers: active, and either marketplace-owned or from an APPROVED seller. */
export const publicProductWhere: Prisma.ProductWhereInput = {
  isActive: true,
  OR: [{ sellerId: null }, { sellerId: { isSet: false } }, { seller: { status: 'APPROVED' } }],
};

/**
 * Runs a catalog fetch and falls back to a safe default instead of throwing,
 * so a database hiccup degrades a section/page to an empty state rather than
 * crashing the whole page to the error boundary.
 */
export async function safeCatalog<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[catalog:${label}] unavailable`, error);
    return fallback;
  }
}

const isObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value);

export type CatalogQuery = {
  q?: string | null;
  category?: string | null;
  seller?: string | null;
  /** Restrict results to these product IDs (used by saved-product pages). */
  ids?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  featured?: boolean;
  sort?: SortKey | null;
  page?: number | null;
  pageSize?: number | null;
  /** Admin listing: include inactive and unapproved-seller products. */
  admin?: boolean;
};

function orderByFor(sort: SortKey | null | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc': return [{ priceRwf: 'asc' }];
    case 'price-desc': return [{ priceRwf: 'desc' }];
    case 'name': return [{ name: 'asc' }];
    case 'featured': return [{ displayPriority: 'desc' }, { createdAt: 'desc' }];
    case 'newest':
    default: return [{ createdAt: 'desc' }];
  }
}

export async function getProducts(query: CatalogQuery = {}) {
  const and: Prisma.ProductWhereInput[] = [];
  if (!query.admin) and.push(publicProductWhere);
  if (query.category) and.push({ category: { slug: query.category } });
  if (query.q) and.push({ OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }] });
  if (query.seller && isObjectId(query.seller)) and.push({ sellerId: query.seller });
  if (query.ids) {
    const ids = [...new Set(query.ids.filter(isObjectId))].slice(0, 60);
    and.push({ id: { in: ids } });
  }
  if (typeof query.minPrice === 'number' && query.minPrice > 0) and.push({ priceRwf: { gte: query.minPrice } });
  if (typeof query.maxPrice === 'number' && query.maxPrice > 0) and.push({ priceRwf: { lte: query.maxPrice } });
  if (query.inStock) and.push({ stock: { gt: 0 } });
  if (query.featured) and.push({ isFeatured: true });
  const where: Prisma.ProductWhereInput = and.length ? { AND: and } : {};

  const paged = typeof query.page === 'number' && query.page > 0;
  const pageSize = Math.min(Math.max(query.pageSize ?? 12, 1), 60);
  const page = paged ? query.page! : 1;

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      select: productSelect,
      orderBy: orderByFor(query.sort),
      ...(paged || query.pageSize ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
    }),
    db.product.count({ where }),
  ]);

  return { products: rows.map(toProductDTO), total, page, pageSize };
}

export async function getProductBySlug(slugOrId: string) {
  const row = await db.product.findFirst({
    where: { AND: [publicProductWhere, isObjectId(slugOrId) ? { OR: [{ slug: slugOrId }, { id: slugOrId }] } : { slug: slugOrId }] },
    select: productSelect,
  });
  return row ? toProductDTO(row) : null;
}

export async function getRelatedProducts(product: ProductDTO, take = 8) {
  const rows = await db.product.findMany({
    where: {
      AND: [
        publicProductWhere,
        { NOT: { id: product.id } },
        product.category ? { OR: [{ categoryId: product.category.id }, ...(product.seller ? [{ sellerId: product.seller.id }] : [])] } : {},
      ],
    },
    select: productSelect,
    orderBy: [{ displayPriority: 'desc' }, { createdAt: 'desc' }],
    take,
  });
  return rows.map(toProductDTO);
}

export async function getCategories(): Promise<CategoryDTO[]> {
  return db.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } });
}

export async function getBestSellers(take = 8) {
  const grouped = await db.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: take * 2,
  });
  if (!grouped.length) return [];
  const ids = grouped.map(group => group.productId);
  const rows = await db.product.findMany({ where: { AND: [publicProductWhere, { id: { in: ids } }] }, select: productSelect });
  const rank = new Map(ids.map((id, index) => [id, index]));
  return rows.map(toProductDTO).sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99)).slice(0, take);
}

export async function getPublicSellers() {
  const sellers = await db.seller.findMany({
    where: { status: 'APPROVED' },
    select: { ...safeSellerSelect, createdAt: true, _count: { select: { products: true } } },
    orderBy: { businessName: 'asc' },
  });
  const previews = await db.product.findMany({
    where: { AND: [publicProductWhere, { sellerId: { in: sellers.map(seller => seller.id) } }] },
    select: productSelect,
    orderBy: [{ displayPriority: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });
  return sellers.map(seller => ({
    id: seller.id,
    businessName: seller.businessName,
    address: seller.address,
    since: seller.createdAt.toISOString(),
    products: previews.filter(product => product.seller?.id === seller.id).map(toProductDTO),
  }));
}

/** First-run convenience kept from the original /api/products route. */
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

export async function ensureStarterCatalog() {
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
      create: { sku: item.sku, name: item.name, slug: item.slug, priceRwf: item.priceRwf, stock: item.stock, imageUrl: item.imageUrl, categoryId: category.id, isActive: true },
    });
  }
}

export async function getSellerOptions() {
  return db.seller.findMany({ where: { status: 'APPROVED' }, select: { id: true, businessName: true }, orderBy: { businessName: 'asc' } });
}
