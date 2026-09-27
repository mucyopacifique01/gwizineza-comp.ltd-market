import type { ReactNode } from 'react';
import { ProductImage } from './ProductImage';

export type StackItem = { key: string; src: string | null; alt: string };

/**
 * The Gwizineza layered presentation: one main item in front, up to three smaller
 * items tucked behind it. Used by the hero, spotlight, categories, sellers, product
 * gallery and the admin storefront preview.
 */
export function ImageStack({ main, behind, size = 'md', frame = 'arch', priority, children }: { main: StackItem; behind: StackItem[]; size?: 'sm' | 'md' | 'lg' | 'hero'; frame?: 'arch' | 'round'; priority?: boolean; children?: ReactNode }) {
  const sizes = size === 'hero' ? '(max-width: 900px) 80vw, 520px' : size === 'lg' ? '(max-width: 900px) 90vw, 560px' : size === 'md' ? '(max-width: 640px) 70vw, 320px' : '160px';
  return (
    <div className={`istack istack-${size}`}>
      {behind.slice(0, 3).map((item, index) => (
        <div key={item.key} className={`istack-layer istack-l${index + 1}`}>
          <div className="istack-frame"><ProductImage src={item.src} alt={item.alt} sizes="(max-width: 640px) 40vw, 220px" /></div>
        </div>
      ))}
      <div className={`istack-main istack-${frame}`}>
        <div className="istack-frame"><ProductImage src={main.src} alt={main.alt} sizes={sizes} priority={priority} /></div>
      </div>
      {children}
    </div>
  );
}
