'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ProductDTO } from '@/lib/types';
import { useCart } from '@/components/providers/CartProvider';
import { Button } from '@/components/ui/Button';
import { QuantityStepper } from './QuantityStepper';
import { WishlistButton } from './WishlistButton';

export function BuyBox({ product }: { product: ProductDTO }) {
  const router = useRouter();
  const { add, pending, ready, cart } = useCart();
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const inCart = cart.items.find(i => i.productId === product.id)?.quantity ?? 0;
  const maxAddable = Math.max(0, product.stock - inCart);
  const out = product.stock < 1;

  async function buyNow() {
    setBuying(true);
    const ok = inCart > 0 ? true : await add(product, qty);
    if (ok) router.push('/checkout');
    else setBuying(false);
  }

  return (
    <div className="buybox">
      {!out && (
        <div className="row wrap">
          <QuantityStepper value={Math.min(qty, Math.max(maxAddable, 1))} max={Math.max(maxAddable, 1)} onChange={setQty} disabled={maxAddable < 1} />
          {inCart > 0 && <span className="muted small">{inCart} already in your cart</span>}
        </div>
      )}
      <div className="buybox-actions">
        <Button size="lg" icon="bag" loading={Boolean(pending[product.id]) && !buying} disabled={out || !ready || maxAddable < 1} onClick={() => void add(product, qty)} block>
          {out ? 'Sold out' : maxAddable < 1 ? 'Max in cart' : 'Add to cart'}
        </Button>
        <Button size="lg" variant="dark" loading={buying} disabled={out || !ready} onClick={() => void buyNow()} block>Buy now</Button>
        <WishlistButton productId={product.id} name={product.name} className="btn btn-outline btn-icon btn-lg wish-lg" />
      </div>
    </div>
  );
}
