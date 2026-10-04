'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type WishlistApi = { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => Promise<boolean> };
const KEY = 'gwizineza-wishlist';
const WishlistContext = createContext<WishlistApi>({ ids: [], has: () => false, toggle: async () => false });

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Request failed');
  return body as T;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (Array.isArray(raw) && alive) setIds(raw.filter((x): x is string => typeof x === 'string'));
    } catch { /* ignore */ }

    void api<{ customer: { id: string } }>('/api/customer/me')
      .then(async () => {
        if (!alive) return;
        setSignedIn(true);
        const data = await api<{ items: { product: { id: string } }[] }>('/api/wishlist');
        if (alive) setIds(data.items.map(item => item.product.id));
      })
      .catch(() => {
        if (alive) setSignedIn(false);
      });

    return () => { alive = false; };
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(async (id: string) => {
    const currentlySaved = ids.includes(id);
    if (signedIn) {
      if (currentlySaved) await api('/api/wishlist', { method: 'DELETE', body: JSON.stringify({ productId: id }) });
      else await api('/api/wishlist', { method: 'POST', body: JSON.stringify({ productId: id }) });
    } else {
      const next = currentlySaved ? ids.filter(x => x !== id) : [...ids, id];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    }
    const next = currentlySaved ? ids.filter(x => x !== id) : [...ids, id];
    setIds(next);
    return !currentlySaved;
  }, [ids, signedIn]);

  const value = useMemo(() => ({ ids, has, toggle }), [ids, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
