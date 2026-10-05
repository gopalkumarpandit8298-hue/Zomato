/**
 * Verifies the Firestore security posture using the client SDK, exactly as the
 * browser would.
 *
 *   npm run verify:security
 *
 * Runs two passes:
 *  1. anonymous  — everything privileged must be denied
 *  2. admin      — the allow-listed account must be allowed (set ADMIN_EMAIL and
 *                  ADMIN_PASSWORD to enable this pass; it is skipped otherwise)
 *
 * The admin pass creates and deletes one probe document, so nothing real is
 * touched.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { collection, deleteDoc, doc, getDocs, limit, query, setDoc } from 'firebase/firestore';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

async function loadDotEnv(): Promise<void> {
  try {
    const contents = await readFile(resolve(PROJECT_ROOT, '.env'), 'utf8');
    for (const raw of contents.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i === -1) continue;
      const key = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] ??= value;
    }
  } catch {
    /* no .env */
  }
}

await loadDotEnv();

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID,
      });

const { getFirestore } = await import('firebase/firestore');
const db = getFirestore(app);

const results: Array<{ name: string; ok: boolean; detail: string }> = [];

const expect = async (name: string, run: () => Promise<unknown>, shouldSucceed: boolean) => {
  try {
    const value = await run();
    const count = Array.isArray(value) ? value.length : undefined;
    results.push({
      name,
      ok: shouldSucceed,
      detail: shouldSucceed ? `allowed${count === undefined ? '' : ` (${count} docs)`}` : 'UNEXPECTEDLY ALLOWED',
    });
  } catch (error) {
    const code = (error as { code?: string }).code ?? 'unknown';
    results.push({
      name,
      ok: !shouldSucceed,
      detail: shouldSucceed ? 'UNEXPECTEDLY DENIED' : `denied (${code})`,
    });
  }
};

// --- Public catalogue must stay readable ---------------------------------
await expect('anonymous read of restaurants', () => getDocs(query(collection(db, 'restaurants'), limit(3))), true);
await expect('anonymous read of categories', () => getDocs(query(collection(db, 'categories'), limit(3))), true);
await expect('anonymous read of a restaurant menu', () => getDocs(collection(db, 'restaurants', 'pizza-punjab', 'menu')), true);

// --- Orders must be completely closed to anonymous users -----------------
await expect('anonymous read of orders', () => getDocs(query(collection(db, 'orders'), limit(3))), false);
await expect('anonymous write of an order', () => setDoc(doc(collection(db, 'orders'), 'probe'), { userId: 'anon' }), false);
await expect('anonymous read of the order counter', () => getDocs(collection(db, 'orderCounters')), false);

// --- The catalogue must be immutable from the client --------------------
await expect('anonymous write to restaurants', () => setDoc(doc(db, 'restaurants', 'pizza-punjab'), { name: 'hacked' }), false);

console.log('');
for (const result of results) {
  console.log(`  ${result.ok ? 'PASS' : 'FAIL'}  ${result.name.padEnd(42)} ${result.detail}`);
}

const failed = results.filter((r) => !r.ok);
console.log('');
console.log(failed.length === 0 ? 'Security posture OK.' : `${failed.length} check(s) failed.`);

// What still needs a human: a real Google login and a real checkout.
const orders = await getDocs(query(collection(db, 'orders'), limit(1))).catch(() => null);
console.log(
  orders === null
    ? 'Orders collection: not readable without auth (expected).'
    : `Orders collection: ${orders.size} document(s) visible anonymously.`,
);

// ---------------------------------------------------------------------------
// Pass 2: the admin account. Optional, so CI can run without secrets.
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log('\nSkipping the admin pass (set ADMIN_EMAIL and ADMIN_PASSWORD to include it).');
} else {
  const { getAuth, signInWithEmailAndPassword, signOut } = await import('firebase/auth');
  const auth = getAuth(app);

  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log(`\nAdmin pass — signed in as ${ADMIN_EMAIL}`);

    await expect('admin reads every order', () => getDocs(query(collection(db, 'orders'), limit(5))), true);
    await expect('admin reads the order counter', () => getDocs(collection(db, 'orderCounters')), true);
    await expect('admin reads all restaurants', () => getDocs(query(collection(db, 'restaurants'), limit(5))), true);

    const PROBE = 'zz-security-probe';
    await expect(
      'admin writes a restaurant',
      () => setDoc(doc(db, 'restaurants', PROBE), { name: 'probe', cuisines: [] }),
      true,
    );
    await expect('admin deletes a restaurant', () => deleteDoc(doc(db, 'restaurants', PROBE)), true);

    await expect('admin reads a menu subcollection', () => getDocs(collection(db, 'restaurants', 'pizza-punjab', 'menu')), true);
    await expect(
      'admin writes a menu item',
      () => setDoc(doc(db, 'restaurants', 'pizza-punjab', 'menu', 'zz-probe'), { name: 'probe', price: 1 }),
      true,
    );
    await expect(
      'admin deletes the probe menu item',
      () => deleteDoc(doc(db, 'restaurants', 'pizza-punjab', 'menu', 'zz-probe')),
      true,
    );
  } catch (error) {
    results.push({
      name: 'admin sign-in',
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await signOut(auth).catch(() => {});
  }

  console.log('');
  for (const result of results.filter((r) => r.name.startsWith('admin'))) {
    console.log(`  ${result.ok ? 'PASS' : 'FAIL'}  ${result.name.padEnd(42)} ${result.detail}`);
  }
}

const totalFailed = results.filter((r) => !r.ok).length;
console.log('');
console.log(totalFailed === 0 ? 'Security posture OK.' : `${totalFailed} check(s) failed.`);
if (totalFailed > 0) process.exitCode = 1;
