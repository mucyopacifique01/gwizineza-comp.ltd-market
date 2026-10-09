import { FigmaMarketplacePage } from '@/components/content/FigmaMarketplacePage';
import { getProducts, safeCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const result = await safeCatalog(
    'compare-products',
    { products: [], total: 0, page: 1, pageSize: 60 } as Awaited<ReturnType<typeof getProducts>>,
    () => getProducts({ pageSize: 60, sort: 'newest' }),
  );

  return <FigmaMarketplacePage kind="compare" products={result.products} />;
}
