'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/** Smooth enter animation for marketing/static routes. Respects .reduce-motion. */
export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={cn('page-transition-enter', className)}>{children}</div>;
}
