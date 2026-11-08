'use client';

import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { LocalDemoProvider } from '@/local-demo/LocalDemoProvider';
import { isLocalDemoClient } from '@/lib/local-demo/config';

function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  }, []);

  return (
    <>
      <main id="app-main" className="flex-grow flex flex-col">
        {children}
      </main>
      <Toaster />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const useLocal = isLocalDemoClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      themes={['light', 'dark', 'high-contrast']}
    >
      {useLocal ? (
        <LocalDemoProvider>
          <AppShell>{children}</AppShell>
        </LocalDemoProvider>
      ) : (
        <FirebaseClientProvider>
          <AppShell>{children}</AppShell>
        </FirebaseClientProvider>
      )}
    </ThemeProvider>
  );
}
