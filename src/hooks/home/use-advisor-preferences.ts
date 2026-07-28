'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import type { Advisor } from '@/lib/types';
import { applyAdvisorPresentation } from '@/lib/theme/apply-advisor-theme';
import { DDHUB_KEYS, getSessionItem, setSessionItem } from '@/lib/auth/session-keys';

function mergeSessionTheme(advisor: Advisor): Advisor {
  const existingRaw = getSessionItem(DDHUB_KEYS.advisorProfile);
  if (!existingRaw) return advisor;
  try {
    const existing = JSON.parse(existingRaw) as Advisor;
    if (
      existing.id === advisor.id &&
      existing.themePreference &&
      existing.themePreference !== advisor.themePreference
    ) {
      return { ...advisor, themePreference: existing.themePreference };
    }
  } catch {
    /* ignore */
  }
  return advisor;
}

export function useAdvisorPreferences(advisor: Advisor | null) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();
  const advisorRef = useRef(advisor);
  advisorRef.current = advisor;

  // Keep session profile in sync; preserve a locally toggled theme until Firestore catches up
  useEffect(() => {
    if (!advisor) return;
    setSessionItem(DDHUB_KEYS.advisorProfile, JSON.stringify(mergeSessionTheme(advisor)));
  }, [advisor]);

  // Re-apply presentation only when visual prefs change — not on XP / fleet churn
  useEffect(() => {
    const current = advisorRef.current;
    if (!current) return;
    applyAdvisorPresentation(mergeSessionTheme(current), setTheme);
  }, [
    advisor?.id,
    advisor?.themePreference,
    advisor?.fontSize,
    advisor?.reduceMotion,
    advisor?.overdueGlowColor,
    setTheme,
  ]);

  useEffect(() => {
    if (!advisor) return;
    const currentTab = searchParams.get('tab');
    const isDemoVisit = getSessionItem(DDHUB_KEYS.demoMode) === 'true';
    if (!currentTab && isDemoVisit) {
      router.replace('/?tab=fleet', { scroll: false });
    } else if (!currentTab) {
      const landing = advisor.defaultTab || 'fleet';
      router.replace(`/?tab=${landing}`, { scroll: false });
    }
  }, [advisor?.id, advisor?.defaultTab, router, searchParams, advisor]);
}
