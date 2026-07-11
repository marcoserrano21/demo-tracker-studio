/** Client sessionStorage keys for Demo Drive Hub */

export const DDHUB_KEYS = {
  store: 'ddhub-store',
  role: 'ddhub-role',
  advisor: 'ddhub-advisor',
  advisorProfile: 'ddhub-advisor-profile',
  demoMode: 'ddhub-demo-mode',
  celebratedAchievements: (advisorId: string) => `ddhub-${advisorId}-celebrated-achievements`,
} as const;

export type DdhubSessionKey =
  | typeof DDHUB_KEYS.store
  | typeof DDHUB_KEYS.role
  | typeof DDHUB_KEYS.advisor
  | typeof DDHUB_KEYS.advisorProfile
  | typeof DDHUB_KEYS.demoMode;

const LEGACY_MAP: Record<string, string> = {
  'tesla-tracker-store': DDHUB_KEYS.store,
  'tesla-tracker-role': DDHUB_KEYS.role,
  'tesla-tracker-advisor': DDHUB_KEYS.advisor,
  'tesla-tracker-advisor-profile': DDHUB_KEYS.advisorProfile,
};

/** Read sessionStorage with one-time migration from legacy tesla-tracker-* keys. */
export function getSessionItem(key: DdhubSessionKey): string | null {
  if (typeof window === 'undefined') return null;

  const value = sessionStorage.getItem(key);
  if (value !== null) return value;

  const legacyKey = Object.entries(LEGACY_MAP).find(([, v]) => v === key)?.[0];
  if (legacyKey) {
    const legacyValue = sessionStorage.getItem(legacyKey);
    if (legacyValue !== null) {
      sessionStorage.setItem(key, legacyValue);
      sessionStorage.removeItem(legacyKey);
      return legacyValue;
    }
  }

  return null;
}

export function getCelebratedAchievementsItem(advisorId: string): string | null {
  if (typeof window === 'undefined') return null;
  const key = DDHUB_KEYS.celebratedAchievements(advisorId);
  const value = sessionStorage.getItem(key);
  if (value !== null) return value;

  const legacyKey = `tesla-tracker-${advisorId}-celebrated-achievements`;
  const legacyValue = sessionStorage.getItem(legacyKey);
  if (legacyValue !== null) {
    sessionStorage.setItem(key, legacyValue);
    sessionStorage.removeItem(legacyKey);
    return legacyValue;
  }
  return null;
}

export function setSessionItem(key: DdhubSessionKey, value: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(key, value);
}

export function setCelebratedAchievementsItem(advisorId: string, value: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DDHUB_KEYS.celebratedAchievements(advisorId), value);
}

export function removeSessionItem(key: DdhubSessionKey): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(key);
  const legacyKey = Object.entries(LEGACY_MAP).find(([, v]) => v === key)?.[0];
  if (legacyKey) sessionStorage.removeItem(legacyKey);
}

export function clearDdhubSession(): void {
  if (typeof window === 'undefined') return;
  removeSessionItem(DDHUB_KEYS.store);
  removeSessionItem(DDHUB_KEYS.role);
  removeSessionItem(DDHUB_KEYS.advisor);
  removeSessionItem(DDHUB_KEYS.advisorProfile);
  removeSessionItem(DDHUB_KEYS.demoMode);
  sessionStorage.removeItem('notified-overdue-vehicles');
  Object.keys(LEGACY_MAP).forEach((k) => sessionStorage.removeItem(k));
}
