'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, jsonBody } from '@/lib/http';
import { getCartId } from '@/lib/cart-id';
import type { CartDTO, CartLine } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

type AddableProduct = { id: string; name: string; stock: number };

type CartApi = {
  cartId: string;
  cart: CartDTO;
  count: number;
  ready: boolean;
  error: string | null;
  pending: Record<string, boolean>;
  bump: number;
  add: (product: AddableProduct, quantity?: number) => Promise<boolean>;
  setQuantity: (line: CartLine, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const empty: CartDTO = { items: [], subtotalRwf: 0 };
const CartContext = createContext<CartApi | null>(null);

/** Server-backed cart (existing /api/cart). The browser only stores the cart id. */
export function CartProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [cartId, setCartId] = useState('');
  const [cart, setCart] = useState<CartDTO>(empty);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [bump, setBump] = useState(0);

  const load = useCallback(async (id: string) => {
    const data = await apiFetch<{ cart: CartDTO }>(`/api/cart?cartId=${encodeURIComponent(id)}`);
    setCart({ ...data.cart, items: data.cart.items ?? [] });
    setError(null);
  }, []);

  useEffect(() => {
    const id = getCartId();
    setCartId(id);
    load(id).catch(e => setError(e instanceof Error ? e.message : 'Could not load your cart.')).finally(() => setReady(true));
  }, [load]);

  const mark = (id: string, value: boolean) => setPending(p => ({ ...p, [id]: value }));

  const add = useCallback<CartApi['add']>(async (product, quantity = 1) => {
    if (!cartId) return false;
    const existing = cart.items.find(item => item.productId === product.id)?.quantity ?? 0;
    const next = existing + quantity;
    if (product.stock < 1) { toast.show(`${product.name} is out of stock.`, { tone: 'error' }); return false; }
    if (next > product.stock) { toast.show(`Only ${product.stock} available. You already have ${existing} in your cart.`, { tone: 'error' }); return false; }
    mark(product.id, true);
    try {
      await apiFetch('/api/cart', { method: 'POST', body: jsonBody({ cartId, productId: product.id, quantity: next }) });
      await load(cartId);
      setBump(b => b + 1);
      toast.show(`${product.name} added to your cart`, { action: { label: 'View cart', href: '/cart' } });
      return true;
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not add this product.', { tone: 'error' });
      return false;
    } finally { mark(product.id, false); }
  }, [cartId, cart.items, load, toast]);

  const setQuantity = useCallback<CartApi['setQuantity']>(async (line, quantity) => {
    if (quantity < 1) return;
    if (quantity > line.product.stock) { toast.show(`Only ${line.product.stock} available.`, { tone: 'error' }); return; }
    mark(line.productId, true);
    const previous = cart;
    setCart(c => {
      const items = c.items.map(i => (i.productId === line.productId ? { ...i, quantity } : i));
      return { ...c, items, subtotalRwf: items.reduce((s, i) => s + i.quantity * i.product.priceRwf, 0) };
    });
    try {
      await apiFetch('/api/cart', { method: 'POST', body: jsonBody({ cartId, productId: line.productId, quantity }) });
      await load(cartId);
    } catch (e) {
      setCart(previous);
      toast.show(e instanceof Error ? e.message : 'Could not update quantity.', { tone: 'error' });
    } finally { mark(line.productId, false); }
  }, [cart, cartId, load, toast]);

  const remove = useCallback<CartApi['remove']>(async productId => {
    mark(productId, true);
    try {
      await apiFetch('/api/cart', { method: 'DELETE', body: jsonBody({ cartId, productId }) });
      await load(cartId);
      toast.show('Removed from cart', { tone: 'info' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not remove this item.', { tone: 'error' });
    } finally { mark(productId, false); }
  }, [cartId, load, toast]);

  const refresh = useCallback(async () => { if (cartId) await load(cartId); }, [cartId, load]);

  const count = useMemo(() => cart.items.reduce((sum, item) => sum + item.quantity, 0), [cart.items]);
  const value = useMemo(() => ({ cartId, cart, count, ready, error, pending, bump, add, setQuantity, remove, refresh }), [cartId, cart, count, ready, error, pending, bump, add, setQuantity, remove, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
