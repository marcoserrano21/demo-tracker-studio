'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = Math.floor((Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 30 seconds of usage
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    } else {
      console.log('PWA installation dismissed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5 duration-500">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card via-card/95 to-card/85 shadow-2xl backdrop-blur-xl">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-60" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-[4rem] opacity-40" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full hover:bg-muted/80 z-10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="relative pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 shadow-lg">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Install App</CardTitle>
              <CardDescription className="text-xs">Add to Home Screen</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Install Demo Drive Hub for quick access, offline support, and a native app experience.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl font-semibold"
            >
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="rounded-xl border-border/60 hover:border-border"
            >
              Later
            </Button>
          </div>

          {/* Benefits */}
          <div className="space-y-1 pt-2 border-t border-border/40">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-primary" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-primary" />
              <span>Fast loading</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-primary" />
              <span>Push notifications</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
