'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global error boundary]', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Demo Drive Hub is unavailable</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            A critical error occurred - often a Firestore permission mismatch after signing in to a
            different store. Sign out, pick your store again, and retry.
          </p>
          <Button type="button" onClick={() => reset()}>
            Reload app
          </Button>
        </main>
      </body>
    </html>
  );
}
