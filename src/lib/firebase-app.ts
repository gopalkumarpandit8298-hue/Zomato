import { initializeApp, getApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';

function readEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readFlag(key: keyof ImportMetaEnv): boolean {
  return readEnv(key).toLowerCase() === 'true';
}

export const firebaseConfig: FirebaseOptions = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
};

/**
 * The app boots with bundled demo data when these are missing, so `npm run dev`
 * never crashes on a fresh clone.
 */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

/**
 * Cloud Storage needs a provisioned bucket, which in turn needs a billing
 * account on the project. Until then every lookup would fail, so the SDK is
 * gated behind this flag and images come from the local `/img/` copies instead
 * of firing doomed requests on every page load.
 *
 * Flip to `true` in `.env` once the bucket exists and `npm run seed` has
 * uploaded the assets.
 */
export const isStorageEnabled = isFirebaseConfigured && readFlag('VITE_FIREBASE_STORAGE_ENABLED');

/**
 * Emails allowed into the admin panel.
 *
 * Firebase Auth verifies the password; this list only decides who sees the
 * admin UI. `firestore.rules` repeats the same list, because a client-side
 * check is UX, not a security control.
 */
export const adminEmails: string[] = readEnv('VITE_ADMIN_EMAILS')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email: string | null | undefined): boolean =>
  Boolean(email) && adminEmails.includes(email!.trim().toLowerCase());

let app: FirebaseApp | null = null;

/** Lazily initialised singleton — no side effects at import time. */
export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add your keys to .env (see .env.example).');
  }
  app ??= getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return app;
}
