'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/http';

/** Tiny data hook for dashboards: loading / error / reload, and redirect on expired sessions. */
export function useApi<T>(url: string | null, opts: { loginPath?: string } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const login = useRef(opts.loginPath);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      setData(await apiFetch<T>(url));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403) && login.current) {
        window.location.href = login.current;
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { void load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}
