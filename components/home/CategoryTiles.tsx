import Link from 'next/link';
import type { CategoryDTO, ProductDTO } from '@/lib/types';
import { primaryImage } from '@/lib/merchandising';
import { ImageStack } from '@/components/product/ImageStack';
import { Icon } from '@/components/ui/Icon';

export type CategoryWithProducts = CategoryDTO & { products: ProductDTO[]; count: number };

const TINTS = ['tint-sun', 'tint-leaf', 'tint-sky', 'tint-clay', 'tint-cream'];

export function groupByCategory(categories: CategoryDTO[], products: ProductDTO[]): CategoryWithProducts[] {
  return categories
    .map(c => {
      const list = products.filter(p => p.category?.id === c.id);
      const withImg = list.filter(p => primaryImage(p));
      return { ...c, products: (withImg.length ? withImg : list).slice(0, 4), count: list.length };
    })
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function CategoryTiles({ items, limit }: { items: CategoryWithProducts[]; limit?: number }) {
  const list = typeof limit === 'number' ? items.slice(0, limit) : items;
  return (
    <div className="cat-grid">
      {list.map((c, i) => {
        const [main, ...behind] = c.products;
        return (
          <Link key={c.id} href={`/shop?category=${c.slug}`} className={`cat-tile ${TINTS[i % TINTS.length]}${i === 0 ? ' cat-tile-wide' : ''}`}>
            <div className="cat-tile-copy">
              <h3>{c.name}</h3>
              <span>{c.count} product{c.count === 1 ? '' : 's'}</span>
            </div>
            {main && <ImageStack size="sm" frame="round" main={{ key: main.id, src: primaryImage(main), alt: '' }} behind={behind.map(p => ({ key: p.id, src: primaryImage(p), alt: '' }))} />}
            <span className="cat-tile-go" aria-hidden="true"><Icon name="arrowRight" size={18} /></span>
          </Link>
        );
      })}
    </div>
  );
}
