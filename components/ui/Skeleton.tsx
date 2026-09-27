import type { CSSProperties } from 'react';

export function Skeleton({ width, height = 14, radius, style, className }: { width?: number | string; height?: number | string; radius?: number | string; style?: CSSProperties; className?: string }) {
  return <span aria-hidden="true" className={['skeleton', className].filter(Boolean).join(' ')} style={{ display: 'block', width: width ?? '100%', height, borderRadius: radius, ...style }} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="pcard pcard-skeleton" aria-hidden="true">
      <Skeleton height={0} className="pcard-media" style={{ aspectRatio: '1 / 1', height: 'auto', borderRadius: 20 }} />
      <div className="pcard-body">
        <Skeleton width="40%" height={10} />
        <Skeleton width="85%" height={16} />
        <Skeleton width="55%" height={20} />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid" role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="stack" role="status" aria-label="Loading dashboard">
      <div className="stat-grid">{Array.from({ length: 5 }, (_, i) => <div key={i} className="stat-card"><Skeleton width="50%" height={12} /><Skeleton width="70%" height={28} style={{ marginTop: 14 }} /></div>)}</div>
      <div className="dash-grid"><div className="card"><Skeleton height={220} radius={16} /></div><div className="card"><Skeleton height={220} radius={16} /></div></div>
    </div>
  );
}
