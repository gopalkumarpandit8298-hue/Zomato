/**
 * Downloads genuinely license-free images (CC0 / Public Domain Mark) from the
 * Openverse API into `assets/`, then mirrors them to `public/img/` so the app
 * can serve them straight from Firebase Hosting.
 *
 *   npm run assets           # only fetches what is missing
 *   npm run assets -- --force
 *   npm run assets -- --only=biryani-blues,sweet-tooth
 *
 * Why not hotlink? CC0/PDM images have no attribution requirement, so the files
 * can be committed to the repo: builds stay reproducible, there is no third
 * party tracking, and the app keeps working on the Spark plan where Cloud
 * Storage buckets cannot be created.
 *
 * `assets/` is git-ignored (a download cache). `public/img/` is committed.
 */
import { mkdir, readFile, writeFile, copyFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import categoriesJson from '../src/data/categories.json' with { type: 'json' };
import restaurantsJson from '../src/data/restaurants.json' with { type: 'json' };

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ASSETS_DIR = join(PROJECT_ROOT, 'assets');
const PUBLIC_IMG_DIR = join(PROJECT_ROOT, 'public', 'img');

const OPENVERSE = 'https://api.openverse.org/v1/images/';
const USER_AGENT = 'zomato-clone/1.0 (educational demo; https://github.com/)';
const CANDIDATES_PER_ITEM = 12;
const MIN_WIDTH = 640;
const MIN_BYTES = 15_000;
const MAX_BYTES = 8_000_000;
const THUMB_WIDTH = 1280;

/**
 * Openverse search terms per catalogue id, plus the words an image must
 * actually mention before it is accepted.
 *
 * `must` / `any` are the guard against loose matches: Openverse happily
 * returns "person with a camera" for a noodle dish because the uploader tagged
 * it loosely. `must` requires every word, `any` requires one of them (use it
 * for synonym sets like dumpling/momo).
 *
 * Kept here rather than in the runtime JSON because it only concerns asset
 * generation.
 */
const QUERIES: Record<string, Query> = {
  'tandoori-nights': { q: 'tandoori chicken grilled', must: ['tandoori'] },
  'biryani-blues': { q: 'biryani rice', must: ['biryani'] },
  'butter-chicken-bazaar': { q: 'butter chicken curry', must: ['butter', 'chicken'], like: ['curry', 'gravy'] },
  'pizza-punjab': { q: 'pizza', must: ['pizza'] },
  'burger-point': { q: 'hamburger burger', must: ['hamburger', 'burger'] },
  'wok-this-way': { q: 'asian noodles', must: ['noodle'], like: ['asian', 'bowl', 'stir'] },
  'sweet-tooth': { q: 'cake dessert', must: ['cake'], like: ['dessert', 'pastry'] },
  'green-bowl': { q: 'salad bowl vegetables', must: ['salad'], like: ['bowl', 'vegetable'] },
  'momo-magic': { q: 'dumplings momo', any: ['dumpling', 'momo'] },
  'rolls-republic': { q: 'burrito wrap', must: ['burrito', 'wrap'] },
  'chai-and-co': { q: 'tea cup', must: ['tea'], like: ['cup', 'chai'] },
  'thali-express': { q: 'thali', must: ['thali'] },
  'pasta-amore': { q: 'pasta spaghetti', must: ['pasta', 'spaghetti'] },
  'samosa-street': { q: 'samosa', must: ['samosa'] },
  all: { q: 'food table spread', any: ['food', 'meal', 'table', 'dinner', 'lunch', 'buffet'], like: ['spread', 'many'] },
  biryani: { q: 'biryani', must: ['biryani'] },
  pizza: { q: 'pizza', must: ['pizza'] },
  burger: { q: 'hamburger', must: ['hamburger', 'burger'] },
  momos: { q: 'dumplings momo', any: ['dumpling', 'momo'] },
  desserts: { q: 'cake dessert pastry', any: ['cake', 'dessert', 'pastry', 'sweet'] },
  healthy: { q: 'fresh salad vegetables', must: ['salad', 'vegetable'], like: ['fresh'] },
  rolls: { q: 'wrap sandwich', must: ['wrap', 'sandwich', 'burrito'] },
  beverages: { q: 'juice glass', any: ['juice', 'cocktail', 'smoothie', 'lemonade'], like: ['glass', 'drink'] },
  hero: { q: 'gourmet food table', any: ['food', 'meal', 'dinner', 'table', 'buffet'], like: ['gourmet', 'spread', 'restaurant'] },
};

/** Images that are not catalogue entries but are still part of the design. */
const EXTRA_ASSETS: AssetItem[] = [{ id: 'hero', imagePath: 'hero.jpg' }];

interface Query {
  /** Openverse search string. */
  q: string;
  /** Every one of these must appear in the title or tags. */
  must?: string[];
  /** At least one of these must appear — use for synonym sets. */
  any?: string[];
  /** Optional bonus words. */
  like?: string[];
}

interface OpenverseTag {
  name: string;
}

interface OpenverseImage {
  id: string;
  title: string | null;
  url: string;
  thumbnail: string;
  creator: string | null;
  license: string;
  license_version: string;
  license_url: string;
  provider: string;
  width: number | null;
  height: number | null;
  filetype: string | null;
  category: string | null;
  foreign_landing_url: string;
  mature: boolean;
  tags?: OpenverseTag[];
}

interface AssetItem {
  id: string;
  imagePath: string;
}

interface Credit {
  id: string;
  title: string;
  creator: string;
  license: string;
  licenseUrl: string;
  source: string;
  file: string;
}

function parseArgs(argv: string[]): { force: boolean; only: Set<string> | null } {
  const only = argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
  return {
    force: argv.includes('--force'),
    only: only ? new Set(only.split(',').map((value) => value.trim()).filter(Boolean)) : null,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wikimedia originals can be many megapixels; request a fixed-width thumbnail
 * instead of downloading (and re-encoding) the original.
 */
function toWikimediaThumb(url: string, width = THUMB_WIDTH): string | null {
  const match = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/.exec(url);
  if (!match) return null;
  const [, first, firstTwo, file] = match;
  if (!/\.(jpe?g|png)$/i.test(file)) return null;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${first}/${firstTwo}/${file}/${width}px-${file}`;
}

/** Flickr URLs come with a size suffix; `_b` is 1024px, `_c` is 800px. */
function toFlickrSuffixed(url: string): string {
  return url.replace(/_[a-z]\.(jpe?g|png)$/i, '_b.$1');
}

/**
 * Ordered download candidates, best first.
 *
 * Category chips render at 64px, so they use the Openverse thumbnail proxy
 * (~600px, a fraction of the bytes) instead of a full-size original. Restaurant
 * cards render at ~420px and need the real file.
 */
function candidateUrls(image: OpenverseImage, isChip: boolean): string[] {
  if (isChip) {
    return [...new Set([image.thumbnail, toFlickrSuffixed(image.url), image.url])];
  }

  const urls: string[] = [];
  const wikimedia = toWikimediaThumb(image.url);
  if (wikimedia) urls.push(wikimedia);
  if (image.provider === 'flickr') urls.push(toFlickrSuffixed(image.url));
  urls.push(image.url);
  urls.push(image.thumbnail);
  return [...new Set(urls)];
}

const isUsable = (image: OpenverseImage): boolean => {
  if (image.mature) return false;
  if (image.filetype && !/^jpe?g$/i.test(image.filetype)) return false;
  if (image.category && image.category !== 'photograph') return false;
  if ((image.width ?? 0) < MIN_WIDTH) return false;
  return image.url.startsWith('https://');
};

async function searchImages(query: string): Promise<OpenverseImage[]> {
  const params = new URLSearchParams({
    q: query,
    license: 'cc0,pdm',
    category: 'photograph',
    mature: 'false',
    page_size: String(CANDIDATES_PER_ITEM),
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${OPENVERSE}?${params}`, { headers: { 'User-Agent': USER_AGENT } });
    if (response.ok) {
      const data = (await response.json()) as { results?: OpenverseImage[] };
      return (data.results ?? []).filter(isUsable);
    }
    if (response.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    return [];
  }
  return [];
}

type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp';

/** Identifies the real format from magic bytes. */
function detectFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length < 12) return null;
  const [a, b, c, d] = bytes;
  if (a === 0xff && b === 0xd8 && c === 0xff) return 'jpeg';
  if (a === 0x89 && b === 0x50 && c === 0x4e && d === 0x47) return 'png';
  if (a === 0x47 && b === 0x49 && d === 0x46) return 'gif';
  if (a === 0x52 && b === 0x49 && c === 0x46 && d === 0x46) return 'webp';
  return null;
}

const FORMAT_BY_EXTENSION: Record<string, ImageFormat> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.gif': 'gif',
  '.webp': 'webp',
};

/**
 * Accepts the file only if it really is the format its name promises and is
 * fully written.
 *
 * This matters more than it looks: some hosts content-negotiate and return
 * WebP even when the URL says `.jpg`. Firebase Hosting then serves those bytes
 * as `image/jpeg` and the browser silently renders nothing. Requiring the EOI
 * marker also catches truncated downloads.
 */
function isAcceptableImage(bytes: Uint8Array, extension: string): boolean {
  const expected = FORMAT_BY_EXTENSION[extension];
  const actual = detectFormat(bytes);
  if (!expected || actual !== expected) return false;
  if (actual === 'jpeg') {
    return bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  }
  if (actual === 'png') {
    // IEND chunk terminates a complete PNG.
    return bytes[bytes.length - 8] === 0x49 && bytes[bytes.length - 7] === 0x45;
  }
  return true;
}

async function download(url: string, extension: string): Promise<Uint8Array | null> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) return null;

  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) return null;

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < MIN_BYTES || bytes.length > MAX_BYTES) return null;
  return isAcceptableImage(bytes, extension) ? bytes : null;
}

/**
 * Scores a candidate against the query. Returns `null` when a required word is
 * missing, which is how loosely-tagged noise ("person with a camera" for a
 * noodle dish) gets rejected.
 */
function scoreImage(image: OpenverseImage, query: Query): number | null {
  const title = (image.title ?? '').toLowerCase();
  const tags = (image.tags ?? []).map((tag) => tag.name.toLowerCase()).join(' ');
  const has = (word: string) => title.includes(word) || tags.includes(word);

  let score = 0;

  for (const word of query.must ?? []) {
    if (!has(word)) return null;
    score += title.includes(word) ? 5 : 2;
  }

  if ((query.must ?? []).length === 0) {
    const anyHits = (query.any ?? []).filter(has);
    if (anyHits.length === 0) return null;
    score += 4 * anyHits.length;
  }

  for (const word of query.like ?? []) {
    if (has(word)) score += 1;
  }

  const width = image.width ?? 0;
  const height = image.height ?? 0;
  if (width >= 1000) score += 1;
  if (height > 0 && width / height >= 1.2 && width / height <= 2.4) score += 1;
  if (image.provider === 'flickr' || image.provider === 'stocksnap') score += 1;

  return score;
}

async function fetchOne(item: AssetItem, force: boolean): Promise<Credit | null> {
  const target = join(ASSETS_DIR, item.imagePath);

  if (!force && existsSync(target)) {
    const { size } = await stat(target);
    if (size >= MIN_BYTES) {
      console.log(`  cached     ${item.imagePath} (${Math.round(size / 1024)} kB)`);
      return null;
    }
  }

  const query = QUERIES[item.id];
  if (!query) {
    console.log(`  NO QUERY   ${item.imagePath} — add one to QUERIES in scripts/fetch-assets.ts`);
    return null;
  }

  const images = await searchImages(query.q);
  if (images.length === 0) {
    console.log(`  no results ${item.imagePath} — "${query.q}"`);
    return null;
  }

  const ranked = images
    .map((image) => ({ image, score: scoreImage(image, query) }))
    .filter((entry): entry is { image: OpenverseImage; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    const requirement = query.must?.length ? query.must.join(' + ') : (query.any ?? []).join(' / ');
    console.log(`  no match   ${item.imagePath} — nothing mentions ${requirement}`);
    return null;
  }

  const isChip = item.imagePath.startsWith('categories/');
  const extension = extname(item.imagePath).toLowerCase();

  for (const { image, score } of ranked) {
    for (const url of candidateUrls(image, isChip)) {
      const bytes = await download(url, extension);
      if (!bytes) continue;

      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
      const title = image.title ?? item.id;
      console.log(
        `  fetched    ${item.imagePath} (${Math.round(bytes.length / 1024)} kB, score ${score}) <- ${image.provider} [${image.license}] "${title}"`,
      );

      return {
        id: item.id,
        title,
        creator: image.creator ?? 'Unknown',
        license: `${image.license} ${image.license_version}`.trim(),
        licenseUrl: image.license_url,
        source: image.foreign_landing_url,
        file: item.imagePath,
      };
    }
    // Anonymous Openverse is rate-limited; be a polite API citizen.
    await sleep(250);
  }

  console.log(`  FAILED     ${item.imagePath} — ranked candidates were not downloadable`);
  return null;
}

/** Mirrors assets/ into public/img/ so Vite serves them at `/img/<path>`. */
async function mirrorToPublic(): Promise<number> {
  const mirrors: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      const relative = full.slice(ASSETS_DIR.length + 1);
      const destination = join(PUBLIC_IMG_DIR, relative);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(full, destination);
      mirrors.push(relative);
    }
  };

  await walk(ASSETS_DIR);
  return mirrors.length;
}

async function writeCredits(credits: Credit[]): Promise<void> {
  const lines = [
    '# Image credits',
    '',
    'Every image in this project was fetched from [Openverse](https://openverse.org)',
    'under a **CC0 1.0** or **Public Domain Mark 1.0** licence, so no attribution is',
    'required. This file is a courtesy record, not a legal requirement.',
    '',
    'Regenerate with `npm run assets -- --force`.',
    '',
    '| File | Title | Creator | Licence | Source |',
    '| ---- | ----- | ------- | ------- | ------ |',
    ...credits.map(
      (credit) =>
        `| \`${credit.file}\` | ${credit.title} | ${credit.creator} | [${credit.license}](${credit.licenseUrl}) | [link](${credit.source}) |`,
    ),
    '',
  ];
  await writeFile(join(PROJECT_ROOT, 'ASSET-CREDITS.md'), lines.join('\n'), 'utf8');
}

async function loadExistingCredits(): Promise<Credit[]> {
  try {
    const raw = await readFile(join(PROJECT_ROOT, 'ASSET-CREDITS.json'), 'utf8');
    return JSON.parse(raw) as Credit[];
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const restaurants = (restaurantsJson as { restaurants: AssetItem[] }).restaurants;
  const categories = (categoriesJson as { categories: AssetItem[] }).categories;
  const items = [...restaurants, ...categories, ...EXTRA_ASSETS].filter(
    (item) => args.only === null || args.only.has(item.id),
  );

  console.log(`Fetching CC0/PDM images for ${items.length} items from Openverse...\n`);

  const previous = await loadExistingCredits();
  const credits = new Map(previous.map((credit) => [credit.file, credit]));

  for (const item of items) {
    const credit = await fetchOne(item, args.force);
    if (credit) credits.set(item.imagePath, credit);
  }

  const mirrored = await mirrorToPublic();
  await writeFile(join(PROJECT_ROOT, 'ASSET-CREDITS.json'), JSON.stringify([...credits.values()], null, 2), 'utf8');
  await writeCredits([...credits.values()]);

  console.log(`\nMirrored ${mirrored} files into public/img/`);
  console.log(`Credits written to ASSET-CREDITS.md (${credits.size} entries)`);
  console.log('\nNext: npm run build && npm run deploy:hosting');
}

main().catch((error: unknown) => {
  console.error('\nfetch-assets failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
