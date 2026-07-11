'use client';

import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';

const DISMISS_KEY = 'ddhub-demo-banner-dismissed';

export function DemoBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(DISMISS_KEY) !== 'true';
  });

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  };

  return (
    <div className="border-b border-primary/20 bg-primary/5 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-xs sm:text-sm text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate">
            Portfolio demo — explore the live app or{' '}
            <Link href="/about" className="font-medium text-primary underline underline-offset-4">
              read the case study
            </Link>
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={dismiss}
          aria-label="Dismiss demo banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
