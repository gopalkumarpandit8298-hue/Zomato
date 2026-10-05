import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type Unsubscribe,
  type User,
} from 'firebase/auth';

import { getFirebaseApp, isFirebaseConfigured } from './firebase-app';
import type { AuthUser } from '../types/food';

let auth: Auth | null = null;

function getFirebaseAuth(): Auth {
  auth ??= getAuth(getFirebaseApp());
  return auth;
}

/** Projects `User` down to the fields this app actually renders. */
function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Guest',
    email: user.email ?? '',
    photoURL: user.photoURL,
  };
}

/**
 * Sign in with Google.
 *
 * A popup is the nicer experience, but browsers block it when it is not
 * triggered by a user gesture or when a third-party cookie is unavailable, in
 * which case the redirect flow takes over.
 */
export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await signInWithPopup(getFirebaseAuth(), provider);
  } catch (error) {
    const code = (error as { code?: string }).code ?? '';
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      if (code === 'auth/popup-closed-by-user') return;
      await signInWithRedirect(getFirebaseAuth(), provider);
      return;
    }
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/**
 * Email + password sign-in, used by the admin panel.
 *
 * Firebase does the credential check; the caller still has to verify the
 * resulting user is an admin (see `isAdminEmail`).
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

/** Turns Firebase's error codes into something a human can act on. */
export function describeAuthError(error: unknown): string {
  const code = (error as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a minute.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled for this Firebase project.';
    default:
      return error instanceof Error ? error.message : 'Sign-in failed. Please try again.';
  }
}

/**
 * Subscribes to the auth session.
 *
 * @returns an unsubscribe function; call it in the effect cleanup.
 */
export function subscribeToAuth(
  onNext: (user: AuthUser | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onAuthStateChanged(
    getFirebaseAuth(),
    (user) => onNext(user ? toAuthUser(user) : null),
    (error) => onError(error instanceof Error ? error : new Error(String(error))),
  );
}

export const isAuthAvailable = isFirebaseConfigured;
