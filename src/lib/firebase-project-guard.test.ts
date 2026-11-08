import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalDemoDoesNotUseProductionFirebase } from './firebase-project-guard.ts';
import { BLOCKED_PRODUCTION_FIREBASE_PROJECT_ID } from './firebase-project-guard.ts';

describe('firebase project guard', () => {
  it('throws when local demo targets the production project id', () => {
    assert.throws(
      () =>
        assertLocalDemoDoesNotUseProductionFirebase(
          BLOCKED_PRODUCTION_FIREBASE_PROJECT_ID,
          true,
        ),
      /production Firebase project/,
    );
  });

  it('allows non-production project ids in local demo', () => {
    assert.doesNotThrow(() =>
      assertLocalDemoDoesNotUseProductionFirebase('demo-local-hub', true),
    );
  });
});
