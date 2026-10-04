import type { ReactNode } from 'react';
import { Hills } from '@/components/brand/Motifs';

export function InfoPage({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <>
      <section className="info-hero fig-info-page">
        <Hills className="info-hills" />
        <div className="container">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {lead && <p>{lead}</p>}
        </div>
      </section>
      <div className="container info-body fig-info-page">{children}</div>
    </>
  );
}
