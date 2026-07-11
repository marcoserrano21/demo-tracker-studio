
'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance).catch((error) => {
    // Catch auth configuration errors to prevent app crashes
    if (error.code === 'auth/configuration-not-found') {
      console.warn('Firebase Auth not configured. Please enable Authentication in Firebase Console.');
    } else if (error.code === 'auth/admin-restricted-operation') {
      console.error('❌ Anonymous Authentication is DISABLED in Firebase Console.');
      console.error('📋 To fix: Go to Firebase Console → Authentication → Sign-in method → Enable "Anonymous"');
      console.error('🔗 Direct link: https://console.firebase.google.com/project/studio-2717279964-3f1e2/authentication/providers');
    } else {
      console.error('Anonymous sign-in error:', error);
    }
  });
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}
