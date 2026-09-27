'use client';

import { useCart } from '@/components/providers/CartProvider';
import { Button } from '@/components/ui/Button';

export function AddToCartButton({ product, quantity = 1, size = 'md', block, label = 'Add to cart', compact }: { product: { id: string; name: string; stock: number }; quantity?: number; size?: 'sm' | 'md' | 'lg'; block?: boolean; label?: string; compact?: boolean }) {
  const { add, pending, ready } = useCart();
  const out = product.stock < 1;
  return (
    <Button
      variant={out ? 'outline' : 'primary'}
      size={size}
      block={block}
      icon={compact ? 'plus' : 'bag'}
      iconOnly={compact}
      loading={Boolean(pending[product.id])}
      disabled={out || !ready}
      onClick={() => void add(product, quantity)}
      aria-label={compact ? `Add ${product.name} to cart` : undefined}
    >
      {compact ? undefined : out ? 'Sold out' : label}
    </Button>
  );
}
