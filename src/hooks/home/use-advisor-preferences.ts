'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import type { Advisor } from '@/lib/types';
import { applyAdvisorPresentation } from '@/lib/theme/apply-advisor-theme';
import { DDHUB_KEYS, getSessionItem, setSessionItem } from '@/lib/auth/session-keys';

export function useAdvisorPreferences(advisor: Advisor | null) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!advisor) return;

    setSessionItem(DDHUB_KEYS.advisorProfile, JSON.stringify(advisor));
    applyAdvisorPresentation(advisor, setTheme);

    const currentTab = searchParams.get('tab');
    const isDemoVisit = getSessionItem(DDHUB_KEYS.demoMode) === 'true';
    if (!currentTab && isDemoVisit) {
      router.replace('/?tab=fleet', { scroll: false });
    } else if (!currentTab && advisor.defaultTab) {
      router.replace(`/?tab=${advisor.defaultTab}`, { scroll: false });
    }
  }, [advisor, router, searchParams, setTheme]);
}
