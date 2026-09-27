'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/States';
import { Button, ButtonLink } from '@/components/ui/Button';

/** Friendly boundary for storefront failures (e.g. database unreachable). No internals are shown. */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container section">
      <ErrorState
        art="offline"
        title="The market is taking a short break"
        description="We could not load this page right now. This is usually temporary. Please try again in a moment."
      >
        <Button icon="refresh" onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">Go home</ButtonLink>
      </ErrorState>
      {error.digest && <p className="muted tiny" style={{ textAlign: 'center', marginTop: 12 }}>Reference: {error.digest}</p>}
    </div>
  );
}
