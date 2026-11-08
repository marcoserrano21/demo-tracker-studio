
'use client';

import { firebaseConfig } from '@/firebase/config';
import { assertLocalDemoDoesNotUseProductionFirebase } from '@/lib/firebase-project-guard';
import { isLocalDemoClient } from '@/lib/local-demo/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  assertLocalDemoDoesNotUseProductionFirebase(
    firebaseConfig.projectId,
    isLocalDemoClient(),
  );

  if (!getApps().length) {
    // CRITICAL: Always use our explicit config to ensure correct project
    // This ensures both localhost AND deployed site connect to the same database
    // Project ID: studio-2717279964-3f1e2 (contains all advisor, XP, and drive data)
    console.log('[Firebase Init] Initializing with config:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain
    });
    
    const firebaseApp = initializeApp(firebaseConfig);
    
    // Verify we're connected to the correct project
    console.log('[Firebase Init] Connected to project:', firebaseApp.options.projectId);
    if (firebaseApp.options.projectId !== 'studio-2717279964-3f1e2') {
      console.error('[Firebase Init] ERROR: Connected to wrong project!', firebaseApp.options.projectId);
      console.error('[Firebase Init] Expected: studio-2717279964-3f1e2');
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
