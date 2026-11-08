'use client';

import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { applyReduceMotion } from '@/lib/motion-preference';
import { useLocalDemoStore } from '@/local-demo/store';
import { isLocalDemoClient } from '@/lib/local-demo/config';

type LocalDemoContextValue = {
  active: boolean;
  user: User;
};

const LocalDemoContext = createContext<LocalDemoContextValue | undefined>(undefined);

export function LocalDemoProvider({ children }: { children: ReactNode }) {
  const resetFixture = useLocalDemoStore((s) => s.resetFixture);

  useEffect(() => {
    if (!isLocalDemoClient()) return;
    resetFixture();
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      applyReduceMotion(true);
    }
  }, [resetFixture]);

  const value = useMemo(
    (): LocalDemoContextValue => ({
      active: true,
      user: { uid: 'local-demo-user' } as User,
    }),
    [],
  );

  return <LocalDemoContext.Provider value={value}>{children}</LocalDemoContext.Provider>;
}

export function useLocalDemoContext(): LocalDemoContextValue | undefined {
  return useContext(LocalDemoContext);
}

export function useIsLocalDemoActive(): boolean {
  const ctx = useContext(LocalDemoContext);
  return !!(ctx?.active && isLocalDemoClient());
}
