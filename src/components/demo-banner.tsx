'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="border-b border-primary/25 bg-primary/10 px-4 py-2.5" role="status" aria-live="polite">
      <div className="mx-auto flex max-w-7xl items-center gap-2 text-xs sm:text-sm text-foreground">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0">
          <strong className="font-semibold">Sample data.</strong> Discontinued independent pilot. Not a Tesla product.{' '}
          <Link href="/about" className="font-medium text-primary underline underline-offset-4">
            Case study
          </Link>
        </p>
      </div>
    </div>
  );
}
