import { Skeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container section-tight">
      <Skeleton width={180} height={12} />
      <Skeleton width="50%" height={40} style={{ margin: '14px 0 32px' }} />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
