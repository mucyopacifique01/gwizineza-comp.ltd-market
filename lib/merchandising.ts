/**
 * Pure helpers that turn admin display settings into storefront slots.
 * Fallbacks mean the homepage always looks composed, even before the owner configures anything.
 */
import type { ProductDTO } from '@/lib/types';

export const primaryImage = (product: Pick<ProductDTO, 'imageUrl' | 'images'>) =>
  product.images.find(image => image.isPrimary)?.url ?? product.imageUrl ?? product.images[0]?.url ?? null;

const byPriority = (a: ProductDTO, b: ProductDTO) =>
  (b.displayPriority ?? 0) - (a.displayPriority ?? 0) || Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || b.createdAt.localeCompare(a.createdAt);

export function composeHomepage(all: ProductDTO[], bestSellers: ProductDTO[]) {
  const visible = all.filter(product => product.displaySection !== 'HOME_HIDDEN');
  const withImage = visible.filter(product => primaryImage(product));
  const sorted = [...visible].sort(byPriority);

  const heroMain =
    visible.filter(p => p.displaySection === 'HERO_MAIN').sort(byPriority)[0] ??
    withImage.filter(p => p.isFeatured).sort(byPriority)[0] ??
    withImage.filter(p => p.stock > 0).sort(byPriority)[0] ??
    sorted[0] ?? null;

  const used = new Set(heroMain ? [heroMain.id] : []);
  const pick = (list: ProductDTO[], count: number) => {
    const out: ProductDTO[] = [];
    for (const product of list) {
      if (out.length >= count) break;
      if (used.has(product.id)) continue;
      used.add(product.id);
      out.push(product);
    }
    return out;
  };

  const heroSecondary = pick([
    ...visible.filter(p => p.displaySection === 'HERO_SECONDARY').sort(byPriority),
    ...withImage.sort(byPriority),
  ], 3);

  const spotlight = pick([
    ...visible.filter(p => p.displaySection === 'SPOTLIGHT').sort(byPriority),
    ...visible.filter(p => p.isFeatured).sort(byPriority),
    ...withImage.sort(byPriority),
  ], 5);

  const newArrivals = [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  const best = bestSellers.filter(p => p.displaySection !== 'HOME_HIDDEN').slice(0, 8);
  const recommended = sorted.filter(p => p.stock > 0).slice(0, 8);

  return { heroMain, heroSecondary, spotlight, newArrivals, bestSellers: best, recommended };
}
