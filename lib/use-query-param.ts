'use client';

import { useEffect, useState } from 'react';

/** Reads a URL query param on the client without useSearchParams (avoids Suspense requirements in static client pages). */
export function useQueryParam(name: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => { setValue(new URLSearchParams(window.location.search).get(name)); }, [name]);
  return value;
}
