'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/States';
import { Button, ButtonLink } from '@/components/ui/Button';

/**
 * Admin-area error boundary. Unlike the public boundary, this shows the real error message
 * (the owner is signed in) so a failing page can be diagnosed instead of showing a blank screen.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[admin] render error:', error); }, [error]);
  return (
    <div className="container section">
      <ErrorState
        title="This admin page hit a problem"
        description={<>The page could not be displayed. Details for debugging: <code>{error.message || 'Unknown error'}</code>{error.digest ? <> (ref {error.digest})</> : null}</>}
      >
        <Button icon="refresh" onClick={reset}>Try again</Button>
        <ButtonLink href="/admin/login" variant="outline">Sign in again</ButtonLink>
      </ErrorState>
    </div>
  );
}
