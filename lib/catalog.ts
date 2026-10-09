import type { CategoryDTO, ProductDTO, SortKey } from '@/lib/types';

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

export type PublicSeller = {
  id: string;
  businessName: string;
  address: string | null;
  since: string;
  products: ProductDTO[];
};

const API_BASE = (process.env.DJANGO_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

async function api<T>(path: string): Promise<T> {
  const response = await fetch(API_BASE + path, { cache: 'no-store' });
  if (!response.ok) throw new Error('Django API request failed: ' + response.status);
  return response.json() as Promise<T>;
}

function queryString(query: CatalogQuery = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.seller) params.set('seller', query.seller);
  if (query.ids?.length) params.set('ids', query.ids.slice(0, 60).join(','));
  if (query.minPrice != null) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
  if (query.inStock) params.set('inStock', '1');
  if (query.featured) params.set('featured', '1');
  if (query.sort) params.set('sort', query.sort);
  if (query.page != null) params.set('page', String(query.page));
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize));
  if (query.admin) params.set('admin', 'true');
  const value = params.toString();
  return value ? '?' + value : '';
}

export async function safeCatalog<T>(_label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (error) {
    console.error('[catalog] Django API unavailable', error);
    return fallback;
  }
}

export async function getProducts(query: CatalogQuery = {}) {
  try {
    const result = await api<{ products: ProductDTO[]; total?: number; page?: number; pageSize?: number }>(
      '/api/products' + queryString(query),
    );
    return { products: result.products || [], total: result.total ?? result.products?.length ?? 0, page: result.page ?? 1, pageSize: result.pageSize ?? result.products?.length ?? 0 };
  } catch (error) {
    console.error('[catalog:products] Django API unavailable', error);
    return { products: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 0 };
  }
}

export async function getProductBySlug(slugOrId: string) {
  try {
    const result = await api<{ product: ProductDTO }>('/api/products/' + encodeURIComponent(slugOrId));
    return result.product || null;
  } catch {
    return null;
  }
}

export async function getRelatedProducts(product: ProductDTO, take = 8) {
  return (await getProducts({
    category: product.category?.slug,
    seller: product.seller?.id,
    pageSize: take,
    sort: 'featured',
  })).products.filter(p => p.id !== product.id).slice(0, take);
}

export async function getCategories(): Promise<CategoryDTO[]> {
  try {
    const result = await api<{ categories: CategoryDTO[] }>('/api/categories');
    return result.categories || [];
  } catch {
    return [];
  }
}

export async function getBestSellers(take = 8) {
  return (await getProducts({ sort: 'featured', pageSize: take })).products;
}

export async function getPublicSellers(): Promise<PublicSeller[]> {
  try {
    const result = await api<{ sellers: Array<{
      id: string; businessName: string; address?: string | null; since?: string; products?: ProductDTO[];
    }> }>('/api/sellers');
    return (result.sellers || []).map(seller => ({
      id: seller.id,
      businessName: seller.businessName,
      address: seller.address ?? null,
      since: seller.since ?? '',
      products: seller.products ?? [],
    }));
  } catch {
    return [];
  }
}

export async function getSellerOptions() {
  return (await getPublicSellers()).map(seller => ({ id: seller.id, businessName: seller.businessName }));
}

/** Run python manage.py seed_marketplace from the Django backend to seed demo products. */
export async function ensureStarterCatalog() {
  return undefined;
}
