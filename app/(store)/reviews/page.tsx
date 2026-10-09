import { FigmaMarketplacePage } from '@/components/content/FigmaMarketplacePage';
import { getProducts, safeCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const result = await safeCatalog(
    'reviews-products',
    { products: [], total: 0, page: 1, pageSize: 8 } as Awaited<ReturnType<typeof getProducts>>,
    () => getProducts({ pageSize: 8, sort: 'newest' }),
  );

  return <FigmaMarketplacePage kind="reviews" products={result.products} />;
}
