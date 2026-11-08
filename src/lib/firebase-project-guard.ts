export const BLOCKED_PRODUCTION_FIREBASE_PROJECT_ID = 'studio-2717279964-3f1e2';

export function assertLocalDemoDoesNotUseProductionFirebase(
  projectId: string | undefined,
  localDemoEnabled: boolean,
): void {
  if (!localDemoEnabled) return;
  if (projectId === BLOCKED_PRODUCTION_FIREBASE_PROJECT_ID) {
    throw new Error(
      'Local demo mode cannot use the production Firebase project. Set NEXT_PUBLIC_LOCAL_DEMO=1 and avoid initializing the studio project.',
    );
  }
}
