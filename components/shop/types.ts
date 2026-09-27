export type ShopParams = {
  q: string;
  category: string;
  seller: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: string;
  view: 'grid' | 'list';
  page: number;
};

export function toQuery(params: Partial<ShopParams>) {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.category) sp.set('category', params.category);
  if (params.seller) sp.set('seller', params.seller);
  if (params.minPrice) sp.set('minPrice', params.minPrice);
  if (params.maxPrice) sp.set('maxPrice', params.maxPrice);
  if (params.inStock) sp.set('inStock', '1');
  if (params.sort && params.sort !== 'featured') sp.set('sort', params.sort);
  if (params.view === 'list') sp.set('view', 'list');
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  const s = sp.toString();
  return s ? `?${s}` : '';
}
