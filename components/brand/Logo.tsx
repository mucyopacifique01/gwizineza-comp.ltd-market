import Link from 'next/link';

/**
 * Gwizineza mark: a "G" drawn as a thread that ends in a node —
 * one connection linking seller, market and buyer.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="var(--ink)" />
      <path d="M28.5 13.5A10 10 0 1 0 30 21h-9" fill="none" stroke="var(--cream)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="21" cy="21" r="3.2" fill="var(--sun)" />
      <circle cx="28.5" cy="13.5" r="2.2" fill="var(--leaf)" />
    </svg>
  );
}

export function Logo({ href = '/', light = false, compact = false }: { href?: string; light?: boolean; compact?: boolean }) {
  return (
    <Link href={href} className={`logo${light ? ' logo-light' : ''}`} aria-label="Gwizineza Market home">
      <LogoMark />
      {!compact && (
        <span className="logo-word">
          <strong>GWIZINEZA</strong>
          <small>MARKET</small>
        </span>
      )}
    </Link>
  );
}
