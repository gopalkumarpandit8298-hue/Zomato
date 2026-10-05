/**
 * Seeds Firestore + Cloud Storage from the bundled JSON and local image files.
 *
 *   npm run seed                    # upload assets/ to Storage + write docs
 *   npm run seed -- --skip-images   # Firestore only
 *   npm run seed -- --force-images  # re-upload even if the object exists
 *
 * Requires `.env` with your Firebase web config. Images come from `assets/`
 * (populated by `npm run assets`), falling back to the committed `public/img/`
 * copies so seeding works even without the download cache.
 *
 * Re-running is safe: existing objects are skipped unless --force-images, and
 * documents are upserted by id.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, getMetadata, uploadBytes } from 'firebase/storage';

import restaurantsJson from '../src/data/restaurants.json' with { type: 'json' };
import categoriesJson from '../src/data/categories.json' with { type: 'json' };
import menuJson from '../src/data/menu.json' with { type: 'json' };

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ASSETS_DIR = join(PROJECT_ROOT, 'assets');
const PUBLIC_IMG_DIR = join(PROJECT_ROOT, 'public', 'img');

interface Args {
  skipImages: boolean;
  forceImages: boolean;
}

function parseArgs(argv: string[]): Args {
  return {
    skipImages: argv.includes('--skip-images'),
    forceImages: argv.includes('--force-images'),
  };
}

/** Minimal .env reader so the script needs no extra dependency. */
async function loadDotEnv(): Promise<void> {
  const envPath = join(PROJECT_ROOT, '.env');
  if (!existsSync(envPath)) return;

  const contents = await readFile(envPath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

const ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function readConfig(): FirebaseOptions {
  const missing = ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(', ')}. Copy .env.example to .env and fill in your Firebase keys.`);
  }
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
}

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

/** Prefers the `assets/` cache, then the committed `public/img/` copy. */
async function resolveImageBytes(imagePath: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  for (const base of [ASSETS_DIR, PUBLIC_IMG_DIR]) {
    const localPath = join(base, imagePath);
    if (!existsSync(localPath)) continue;
    const contentType = CONTENT_TYPES[extname(localPath).toLowerCase()] ?? 'image/jpeg';
    return { bytes: await readFile(localPath), contentType };
  }
  return null;
}

async function uploadImage(
  storage: ReturnType<typeof getStorage>,
  imagePath: string,
  args: Args,
): Promise<'uploaded' | 'skipped' | 'missing'> {
  if (!args.forceImages) {
    const metadata = await getMetadata(ref(storage, imagePath)).catch(() => null);
    if (metadata) return 'skipped';
  }

  const payload = await resolveImageBytes(imagePath);
  if (!payload) return 'missing';

  await uploadBytes(ref(storage, imagePath), payload.bytes, {
    contentType: payload.contentType,
    cacheControl: 'public,max-age=31536000,immutable',
  });
  return 'uploaded';
}

interface RestaurantRecord {
  id: string;
  name: string;
  cuisines: string[];
  rating: number;
  ratingCount: number;
  deliveryMinutes: number;
  costForTwo: number;
  area: string;
  city: string;
  pureVeg: boolean;
  discount: string | null;
  featured: boolean;
  imagePath: string;
  fallbackImageUrl: string;
}

interface CategoryRecord {
  id: string;
  label: string;
  imagePath: string;
  fallbackImageUrl: string;
}

interface MenuItemRecord {
  id: string;
  name: string;
  description: string;
  price: number;
  veg: boolean;
  spicy: boolean;
  popular: boolean;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  await loadDotEnv();
  const config = readConfig();

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const db = getFirestore(app);
  const storage = getStorage(app);

  const restaurants = (restaurantsJson as { restaurants: RestaurantRecord[] }).restaurants;
  const categories = (categoriesJson as { categories: CategoryRecord[] }).categories;

  const images: Array<{ imagePath: string; owner: string }> = [
    ...restaurants.map((item) => ({ imagePath: item.imagePath, owner: item.name })),
    ...categories.map((item) => ({ imagePath: item.imagePath, owner: item.label })),
  ];

  const failedImages: string[] = [];

  if (args.skipImages) {
    console.log('Skipping image uploads (--skip-images).');
  } else {
    console.log(`Uploading ${images.length} images to Cloud Storage...`);
    for (const [index, image] of images.entries()) {
      const label = `${image.imagePath} (${image.owner})`;
      try {
        const result = await uploadImage(storage, image.imagePath, args);
        if (result === 'missing') failedImages.push(image.imagePath);
        console.log(`  [${index + 1}/${images.length}] ${result.padEnd(8)} ${label}`);
      } catch (error) {
        failedImages.push(image.imagePath);
        console.warn(`  [${index + 1}/${images.length}] FAILED   ${label} — ${String(error)}`);
      }
    }
  }

  console.log(`\nWriting ${restaurants.length} documents to Firestore \`restaurants\`...`);
  for (const restaurant of restaurants) {
    const { id, ...fields } = restaurant;
    const reference = doc(db, 'restaurants', id);
    const existing = await getDoc(reference).catch(() => null);
    if (existing?.exists()) {
      await setDoc(reference, fields, { merge: true });
      console.log(`  updated  ${id}`);
    } else {
      await setDoc(reference, fields);
      console.log(`  created  ${id}`);
    }
  }

  console.log(`\nWriting ${categories.length} documents to Firestore \`categories\`...`);
  for (const category of categories) {
    const { id, ...fields } = category;
    await setDoc(doc(db, 'categories', id), fields, { merge: true });
    console.log(`  upserted ${id}`);
  }

  const menus = menuJson as unknown as Record<string, MenuItemRecord[]>;
  const menuCount = Object.values(menus).reduce((sum, items) => sum + items.length, 0);
  console.log(`\nWriting ${menuCount} menu items to Firestore \`restaurants/*/menu\`...`);
  for (const [restaurantId, items] of Object.entries(menus)) {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    const batch = writeBatch(db);
    for (const item of items) {
      const { id, ...fields } = item;
      batch.set(doc(restaurantRef, 'menu', id), fields, { merge: true });
    }
    await batch.commit();
    console.log(`  ${restaurantId}: ${items.length} items`);
  }

  if (failedImages.length > 0) {
    console.warn(`\n${failedImages.length} image(s) missing or failed:`);
    for (const path of failedImages) console.warn(`  - ${path}`);
    console.warn('Run `npm run assets` first; the app falls back to /img/ for those.');
  }

  console.log('\nSeed complete. Run `npm run dev` to see the data.');
}

main().catch((error: unknown) => {
  console.error('\nSeed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
