'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Device-local wishlist. There is no wishlist API/model in the backend yet, so this is stored
 * in localStorage and labelled "saved on this device" in the UI. See docs/FRONTEND-UPGRADE.md.
 */
type WishlistApi = { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => boolean };
const KEY = 'gwizineza-wishlist';
const WishlistContext = createContext<WishlistApi>({ ids: [], has: () => false, toggle: () => false });

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try { const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]'); if (Array.isArray(raw)) setIds(raw.filter((x): x is string => typeof x === 'string')); } catch { /* ignore */ }
  }, []);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => {
    let added = false;
    setIds(list => {
      added = !list.includes(id);
      const next = added ? [...list, id] : list.filter(x => x !== id);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    return !ids.includes(id);
  }, [ids]);
  const value = useMemo(() => ({ ids, has, toggle }), [ids, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
