import Image from 'next/image';
import { initials } from '@/lib/format';

const optimizable = (src: string) => src.startsWith('/') || /^https:\/\/[^/]+\.supabase\.co\//.test(src);

/** Next/Image wrapper. Parent must be position:relative with a size. Unknown hosts render unoptimized. */
export function ProductImage({ src, alt, sizes = '(max-width: 640px) 50vw, 25vw', priority, fit = 'contain', className }: { src: string | null | undefined; alt: string; sizes?: string; priority?: boolean; fit?: 'contain' | 'cover'; className?: string }) {
  if (!src) return <ImagePlaceholder name={alt} />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!optimizable(src)}
      className={['pimg', `pimg-${fit}`, className].filter(Boolean).join(' ')}
    />
  );
}

export function ImagePlaceholder({ name }: { name: string }) {
  return (
    <div className="pimg-placeholder" role="img" aria-label={`${name} (no photo yet)`}>
      <span>{initials(name) || 'G'}</span>
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40 C40 20 70 50 100 32 S160 18 200 34" fill="none" stroke="currentColor" strokeWidth="1" /><path d="M0 50 C40 32 70 58 100 42 S160 30 200 44" fill="none" stroke="currentColor" strokeWidth="1" opacity=".6" /></svg>
    </div>
  );
}
