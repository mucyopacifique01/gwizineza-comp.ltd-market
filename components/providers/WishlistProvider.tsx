'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type WishlistApi = { ids: string[]; ready: boolean; has: (id: string) => boolean; toggle: (id: string) => Promise<boolean> };
const KEY = 'gwizineza-wishlist';
const WishlistContext = createContext<WishlistApi>({ ids: [], ready: false, has: () => false, toggle: async () => false });

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Request failed');
  return body as T;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let localIds: string[] = [];
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (Array.isArray(raw)) {
        localIds = Array.from(new Set(raw.filter((x): x is string => typeof x === 'string')));
        setIds(localIds);
      }
    } catch { /* ignore malformed or unavailable local storage */ }

    void api<{ customer: { id: string } }>('/api/customer/me')
      .then(async () => {
        if (!alive) return;
        setSignedIn(true);

        // Preserve guest saves when a shopper signs in: migrate them to the account wishlist.
        let remoteIds: string[] = [];
        try {
          const data = await api<{ items: { product: { id: string } }[] }>('/api/wishlist');
          remoteIds = data.items.map(item => item.product.id);
        } catch {
          // Keep local saves available if the wishlist service is temporarily unavailable.
          if (alive) setIds(localIds);
          return;
        }

        const missing = localIds.filter(id => !remoteIds.includes(id));
        const outcomes = await Promise.allSettled(
          missing.map(productId => api('/api/wishlist', {
            method: 'POST',
            body: JSON.stringify({ productId }),
          })),
        );
        const failed = missing.filter((_, index) => outcomes[index].status === 'rejected');
        let mergedIds = [...remoteIds, ...missing.filter((_, index) => outcomes[index].status === 'fulfilled')];

        // Re-read the server list to reflect any successful inserts exactly as stored.
        try {
          const refreshed = await api<{ items: { product: { id: string } }[] }>('/api/wishlist');
          mergedIds = refreshed.items.map(item => item.product.id);
        } catch {
          // The successful POST results above still provide a safe local view.
        }

        try {
          if (failed.length) localStorage.setItem(KEY, JSON.stringify(failed));
          else localStorage.removeItem(KEY);
        } catch { /* ignore storage restrictions */ }
        if (alive) setIds(Array.from(new Set([...mergedIds, ...failed])));
      })
      .catch(() => {
        // Not signed in: localStorage remains the source of truth.
        if (alive) setSignedIn(false);
      })
      .finally(() => {
        if (alive) setReady(true);
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

  const value = useMemo(() => ({ ids, ready, has, toggle }), [ids, ready, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
