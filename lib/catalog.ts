import type { CategoryDTO, ProductDTO, SortKey } from '@/lib/types';

const API_BASE = (process.env.DJANGO_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export const safeSellerSelect = { id: true, businessName: true, address: true } as const;

export async function safeCatalog<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (error) {
    console.error('[catalog:' + label + '] unavailable', error);
    return fallback;
  }
}

export type CatalogQuery = {
  q?: string | null;
  category?: string | null;
  seller?: string | null;
  ids?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  featured?: boolean;
  sort?: SortKey | null;
  page?: number | null;
  pageSize?: number | null;
  admin?: boolean;
};

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(API_BASE + '/api/' + path.replace(/^\/+/, ''), { cache: 'no-store' });
  if (!response.ok) throw new Error('Django API returned ' + response.status + ' for ' + path);
  return response.json() as Promise<T>;
}

export async function getProducts(query: CatalogQuery = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.seller) params.set('seller', query.seller);
  if (query.ids) params.set('ids', query.ids.join(','));
  if (query.minPrice != null) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
  if (query.inStock) params.set('inStock', '1');
  if (query.featured) params.set('featured', '1');
  if (query.sort) params.set('sort', query.sort);
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  if (query.admin) params.set('admin', 'true');
  const suffix = params.size ? '?' + params.toString() : '';
  return apiGet<{ products: ProductDTO[]; total: number; page: number; pageSize: number }>('products' + suffix);
}

export async function getProductBySlug(slugOrId: string): Promise<ProductDTO | null> {
  try {
    const data = await apiGet<{ product: ProductDTO }>('products/' + encodeURIComponent(slugOrId));
    return data.product ?? null;
  } catch (error) {
    if (String(error).includes('returned 404')) return null;
    throw error;
  }
}

export async function getRelatedProducts(product: ProductDTO, take = 8): Promise<ProductDTO[]> {
  const params = new URLSearchParams({ pageSize: String(take), sort: 'featured', exclude: product.id });
  if (product.category?.slug) params.set('category', product.category.slug);
  if (product.seller?.id) params.set('seller', product.seller.id);
  const data = await apiGet<{ products: ProductDTO[] }>('products?' + params.toString());
  return data.products;
}

export async function getCategories(): Promise<CategoryDTO[]> {
  const data = await apiGet<{ categories: CategoryDTO[] }>('categories');
  return data.categories;
}

export async function getBestSellers(take = 8): Promise<ProductDTO[]> {
  const data = await apiGet<{ products: ProductDTO[] }>('products?sort=best-selling&pageSize=' + String(Math.min(Math.max(take, 1), 60)));
  return data.products;
}

export type PublicSellerDTO = { id: string; businessName: string; address: string | null; since: string; products: ProductDTO[] };

export async function getPublicSellers(): Promise<PublicSellerDTO[]> {
  const data = await apiGet<{ sellers: PublicSellerDTO[] }>('sellers?includeProducts=1');
  return data.sellers;
}

export async function ensureStarterCatalog(): Promise<void> {
  // Starter records are seeded by Django's idempotent seed_catalog command.
  return;
}

export async function getSellerOptions() {
  const data = await apiGet<{ sellers: Array<{ id: string; businessName: string }> }>('sellers');
  return data.sellers.map(seller => ({ id: seller.id, businessName: seller.businessName }));
}
