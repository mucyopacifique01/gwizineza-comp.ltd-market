import type { ReactNode } from 'react';

type Art = 'cart' | 'search' | 'box' | 'orders' | 'bell' | 'error' | 'offline' | 'lock';

/** Small line illustrations in the Gwizineza "connected nodes" style. */
function StateArt({ kind }: { kind: Art }) {
  const accent = kind === 'error' || kind === 'offline' ? 'var(--clay)' : kind === 'lock' ? 'var(--sky)' : 'var(--sun)';
  return (
    <svg className="state-art" viewBox="0 0 132 104" fill="none" aria-hidden="true">
      <path d="M4 86c20-14 38-18 58-10s40 6 66-10" stroke="var(--line-2)" strokeWidth="1.5" strokeDasharray="3 5" />
      <circle cx="18" cy="78" r="4" fill={accent} />
      <circle cx="116" cy="70" r="4" fill="var(--leaf)" />
      <g stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'cart' && <><path d="M44 30h48l-5 38H49l-5-38Z" fill="var(--paper)" /><path d="M56 30v-4a12 12 0 0 1 24 0v4" /><path d="M58 50h20" stroke={accent} /></>}
        {kind === 'search' && <><circle cx="64" cy="44" r="18" fill="var(--paper)" /><path d="m78 58 12 12" /><path d="M57 44h14" stroke={accent} /></>}
        {kind === 'box' && <><path d="M40 36 66 24l26 12v28L66 76 40 64V36Z" fill="var(--paper)" /><path d="m40 36 26 12 26-12M66 48v28" /><circle cx="66" cy="18" r="3" fill={accent} stroke="none" /></>}
        {kind === 'orders' && <><path d="M48 20h36v56l-6-4-6 4-6-4-6 4-6-4-6 4V20Z" fill="var(--paper)" /><path d="M56 34h20M56 44h20M56 54h10" /><path d="M56 34h20" stroke={accent} /></>}
        {kind === 'bell' && <><path d="M50 60V44a16 16 0 0 1 32 0v16l6 6H44l6-6Z" fill="var(--paper)" /><path d="M60 72a6 6 0 0 0 12 0" /><circle cx="82" cy="30" r="4" fill={accent} stroke="none" /></>}
        {kind === 'error' && <><path d="M66 18 40 66h52L66 18Z" fill="var(--paper)" /><path d="M66 38v12M66 58h.01" stroke={accent} /></>}
        {kind === 'offline' && <><path d="M42 44a34 34 0 0 1 48 0M50 53a22 22 0 0 1 32 0M59 62a9 9 0 0 1 14 0" /><path d="M44 28l44 44" stroke={accent} /></>}
        {kind === 'lock' && <><rect x="46" y="40" width="40" height="32" rx="6" fill="var(--paper)" /><path d="M54 40v-8a12 12 0 0 1 24 0v8" /><circle cx="66" cy="56" r="3" fill={accent} stroke="none" /></>}
      </g>
    </svg>
  );
}

export function EmptyState({ art = 'box', title, description, children }: { art?: Art; title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="state">
      <StateArt kind={art} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function ErrorState({ art = 'error', title = 'Something went wrong', description = 'We could not load this right now. Please try again in a moment.', children }: { art?: Art; title?: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="state error" role="alert">
      <StateArt kind={art} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
