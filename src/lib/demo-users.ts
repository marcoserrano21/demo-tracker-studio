import type { Advisor } from '@/lib/types';

/** Portfolio owner — kept in demo seed for manager-access walkthroughs. */
export const DEMO_MANAGER_ADVISOR_NAME = 'Marco Serrano';

/** Max 5 rotating guest identities for Try Demo (no manager access). */
export const DEMO_RANDOM_ADVISOR_PROFILES = [
  { name: 'Alice Johnson', email: 'alice.j@demo.local' },
  { name: 'Bob Williams', email: 'bob.w@demo.local' },
  { name: 'Charlie Brown', email: 'charlie.b@demo.local' },
  { name: 'Diana Miller', email: 'diana.m@demo.local' },
  { name: 'Ethan Davis', email: 'ethan.d@demo.local' },
] as const;

export const DEMO_RANDOM_ADVISOR_NAMES = DEMO_RANDOM_ADVISOR_PROFILES.map(
  (profile) => profile.name
);

export type DemoRandomAdvisorName = (typeof DEMO_RANDOM_ADVISOR_PROFILES)[number]['name'];

export function isDemoRandomAdvisor(
  advisor: Pick<Advisor, 'name' | 'email'> | null | undefined
): boolean {
  if (!advisor) return false;

  if ((DEMO_RANDOM_ADVISOR_NAMES as readonly string[]).includes(advisor.name)) {
    return true;
  }

  const email = advisor.email?.toLowerCase();
  if (!email) return false;

  return DEMO_RANDOM_ADVISOR_PROFILES.some((profile) => profile.email === email);
}

/**
 * Show Manager Access in nav for every advisor session.
 * Elevation still goes through ManagerAuthDialog.
 * Advisors with role manager/moderator are noted for walkthroughs (e.g. Marco).
 */
export function canRequestManagerAccess(
  advisor: Pick<Advisor, 'name' | 'email' | 'role'> | null | undefined
): boolean {
  void advisor;
  return true;
}

/** Elevated session: manager or moderator view. */
export function isElevatedUserRole(role: string | null | undefined): boolean {
  return role === 'manager' || role === 'moderator';
}

export function pickRandomDemoAdvisor(advisors: Advisor[]): Advisor | null {
  const pool = advisors.filter((advisor) => isDemoRandomAdvisor(advisor));
  if (pool.length === 0) return null;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? null;
}

export function getDemoAdvisorEmail(name: string): string {
  if (name === DEMO_MANAGER_ADVISOR_NAME) {
    return 'marco.serrano@demo.local';
  }

  const profile = DEMO_RANDOM_ADVISOR_PROFILES.find((entry) => entry.name === name);
  if (profile) return profile.email;

  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@demo.local`;
}
