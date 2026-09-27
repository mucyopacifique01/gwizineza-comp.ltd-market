'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useApi } from '@/lib/use-api';

export type SellerMe = { id: string; businessName: string; ownerName: string; phone: string; email: string | null; address: string | null; status: string; _count: { products: number } };

const Ctx = createContext<{ seller: SellerMe | null; loading: boolean; error: string | null; reload: () => Promise<void> }>({ seller: null, loading: true, error: null, reload: async () => undefined });

/** Loads /api/seller/me once for the whole seller console; redirects to login if the session expired. */
export function SellerProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useApi<{ seller: SellerMe }>('/api/seller/me', { loginPath: '/seller/login' });
  return <Ctx.Provider value={{ seller: data?.seller ?? null, loading, error, reload }}>{children}</Ctx.Provider>;
}

export const useSeller = () => useContext(Ctx);
