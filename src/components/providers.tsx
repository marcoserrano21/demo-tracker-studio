'use client';

import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/theme-provider';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';

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
      <PWAInstallPrompt />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      themes={['light', 'dark', 'high-contrast']}
    >
      <FirebaseClientProvider>
        <AppShell>{children}</AppShell>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
