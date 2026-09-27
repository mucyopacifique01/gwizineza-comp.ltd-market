import { Skeleton } from '@/components/ui/Skeleton';

export default function ProductLoading() {
  return (
    <div className="container pdp" role="status" aria-label="Loading product">
      <Skeleton width={260} height={12} />
      <div className="pdp-grid" style={{ marginTop: 20 }}>
        <Skeleton height={0} style={{ aspectRatio: '1 / 1', height: 'auto', borderRadius: 32 }} />
        <div className="stack"><Skeleton width={120} height={22} radius={999} /><Skeleton width="80%" height={44} /><Skeleton width="40%" height={18} /><Skeleton width="50%" height={36} /><Skeleton height={56} radius={999} /><Skeleton height={140} radius={20} /></div>
      </div>
    </div>
  );
}
