import { FigmaMarketplacePage } from '@/components/content/FigmaMarketplacePage';
import { getProducts, safeCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function DealsPage() {
  const result = await safeCatalog(
    'deals-products',
    { products: [], total: 0, page: 1, pageSize: 60 } as Awaited<ReturnType<typeof getProducts>>,
    () => getProducts({ pageSize: 60, sort: 'newest' }),
  );

  return <FigmaMarketplacePage kind="deals" products={result.products} />;
}
