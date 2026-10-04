import Link from 'next/link';

export function LogoMark({ size = 36 }: { size?: number }) {
  return <span className="fig-logo-mark" style={{width:size,height:size}} aria-hidden="true">G</span>;
}

export function Logo({ href = '/', light = false, compact = false }: { href?: string; light?: boolean; compact?: boolean }) {
  return <Link href={href} className={`logo fig-logo${light ? ' logo-light' : ''}`} aria-label="Gwizineza Market home">
    <LogoMark size={40}/>
    {!compact && <span className="logo-word"><strong>Gwizineza</strong><small>B2B MARKETPLACE</small></span>}
  </Link>;
}