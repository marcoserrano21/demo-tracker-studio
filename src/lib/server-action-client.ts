'use client';

import { unstable_isUnrecognizedActionError } from 'next/navigation';

const STALE_ACTION_RELOAD_KEY = 'ddhub-stale-action-reload';

function isStaleServerActionError(error: unknown): boolean {
  if (unstable_isUnrecognizedActionError(error)) return true;
  if (error instanceof Error) {
    return error.message.includes('An unexpected response was received from the server');
  }
  return false;
}

/**
 * Detects stale server-action IDs or HTML error responses after HMR / dev-server
 * restarts and reloads once so the client picks up the current action manifest.
 */
export async function invokeServerAction<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (typeof window !== 'undefined' && isStaleServerActionError(error)) {
      if (!sessionStorage.getItem(STALE_ACTION_RELOAD_KEY)) {
        sessionStorage.setItem(STALE_ACTION_RELOAD_KEY, '1');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(STALE_ACTION_RELOAD_KEY);
    }
    throw error;
  }
}
