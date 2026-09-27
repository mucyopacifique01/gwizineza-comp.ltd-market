import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function ShopLoading() {
  return (
    <div className="container shop">
      <div className="shop-head"><Skeleton width={120} height={12} /><Skeleton width="40%" height={40} style={{ marginTop: 12 }} /></div>
      <div className="shop-layout">
        <div className="shop-sidebar"><Skeleton height={320} radius={20} /></div>
        <div className="shop-results"><Skeleton height={52} radius={999} style={{ marginBottom: 20 }} /><ProductGridSkeleton count={9} /></div>
      </div>
    </div>
  );
}
