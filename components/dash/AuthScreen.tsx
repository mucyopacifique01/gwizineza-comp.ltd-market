import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { Hills } from '@/components/brand/Motifs';

export function AuthScreen({ kicker, title, subtitle, children, aside }: { kicker: string; title: string; subtitle: string; children: ReactNode; aside: ReactNode }) {
  return (
    <main className="auth-screen">
      <section className="auth-screen-art" aria-hidden="true">
        <Hills tone="rgba(245,240,230,.12)" className="auth-screen-hills" />
        <div className="auth-screen-art-inner">{aside}</div>
      </section>
      <section className="auth-screen-form">
        <div className="auth-screen-box">
          <Link href="/" className="row" aria-label="Back to Gwizineza Market"><LogoMark size={40} /><span className="eyebrow no-rule">{kicker}</span></Link>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
