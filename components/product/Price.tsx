import { discountPercent } from '@/lib/format';

export function Price({ value, compareAt, size = 'md' }: { value: number; compareAt?: number | null; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const off = discountPercent(value, compareAt);
  return (
    <span className={`price price-${size}`}>
      <span className="price-now">{value.toLocaleString('en-US')}<small> RWF</small></span>
      {off > 0 && compareAt && <><s className="price-was">{compareAt.toLocaleString('en-US')}</s><span className="price-off">−{off}%</span></>}
    </span>
  );
}

export function StockPill({ stock, low = 5 }: { stock: number; low?: number }) {
  if (stock <= 0) return <span className="stock stock-out">Sold out</span>;
  if (stock <= low) return <span className="stock stock-low">Only {stock} left</span>;
  return <span className="stock stock-in">In stock</span>;
}
