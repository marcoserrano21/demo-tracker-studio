import { DDHUB_KEYS, getSessionItem } from '../auth/session-keys';
import { BLOCKED_PRODUCTION_FIREBASE_PROJECT_ID } from '../firebase-project-guard';

export { BLOCKED_PRODUCTION_FIREBASE_PROJECT_ID };

/**
 * When true, the client uses in-memory sample data and does not initialize Firebase.
 * Default on unless explicitly set to "0" (e.g. legacy hosted firebase demo).
 */
export function isLocalDemoClient(): boolean {
  return process.env.NEXT_PUBLIC_LOCAL_DEMO === '1';
}

export function isHideStorePasswordLogin(): boolean {
  if (process.env.NEXT_PUBLIC_HIDE_STORE_LOGIN === '0') return false;
  return isLocalDemoClient() || process.env.NEXT_PUBLIC_HIDE_STORE_LOGIN === '1';
}

export function isPortfolioDemoSession(): boolean {
  if (typeof window === 'undefined') return false;
  return getSessionItem(DDHUB_KEYS.demoMode) === 'true';
}

export function shouldUseLocalDatastore(): boolean {
  return isLocalDemoClient() && isPortfolioDemoSession();
}
