import type { Advisor } from '@/lib/types';
import { applyReduceMotion } from '@/lib/motion-preference';

export function resolveAdvisorTheme(advisor: Advisor): string {
  const pref = advisor.themePreference ?? 'dark';
  return pref === 'system' ? 'dark' : pref;
}

export function applyAdvisorFontSize(advisor: Advisor) {
  const size = advisor.fontSize ?? 'base';
  document.documentElement.style.fontSize =
    size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px';
}

/** Single source of truth for advisor-driven presentation (theme via next-themes caller). */
export function applyAdvisorPresentation(advisor: Advisor, setTheme: (theme: string) => void) {
  setTheme(resolveAdvisorTheme(advisor));
  applyAdvisorFontSize(advisor);
  applyReduceMotion(advisor.reduceMotion === true);

  if (advisor.overdueGlowColor) {
    document.documentElement.style.setProperty('--overdue-glow-color', advisor.overdueGlowColor);
  }
}
