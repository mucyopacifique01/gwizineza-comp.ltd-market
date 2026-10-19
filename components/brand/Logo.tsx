'use client';

import Link from 'next/link';
import { createContext, useContext, type ReactNode } from 'react';

export type LogoUrls = { logo: string; logo_light: string };
const DEFAULT: LogoUrls = { logo: '/brand/logo-mark-on-dark.png', logo_light: '/brand/logo-mark-on-light.png' };
const LogoContext = createContext<LogoUrls>(DEFAULT);

/** Supplies the owner-editable logo (Admin → Homepage slider & logo) to every <Logo>/<LogoMark>. */
export function LogoProvider({ logo, children }: { logo?: Partial<LogoUrls> | null; children: ReactNode }) {
  return <LogoContext.Provider value={{ ...DEFAULT, ...(logo || {}) }}>{children}</LogoContext.Provider>;
}

/** The Gwizineza mark. `onLight` uses the dark-green version for white/paper backgrounds. */
export function LogoMark({ size = 36, onLight = false }: { size?: number; onLight?: boolean }) {
  const urls = useContext(LogoContext);
  const src = onLight ? urls.logo_light : urls.logo;
  return (
    // Plain <img>: the owner may replace the logo with any uploaded or HTTPS image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden="true" width={size} height={size} className="fig-logo-img" style={{ width: size, height: size }} draggable={false} />
  );
}

export function Logo({ href = '/', light = false, compact = false }: { href?: string; light?: boolean; compact?: boolean }) {
  return <Link href={href} className={`logo fig-logo${light ? ' logo-light' : ''}`} aria-label="Gwizineza Market home">
    <LogoMark size={44}/>
    {!compact && <span className="logo-word"><strong>Gwizineza</strong><small>B2B MARKETPLACE</small></span>}
  </Link>;
}
