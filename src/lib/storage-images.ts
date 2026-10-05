import { getDownloadURL, getMetadata, ref } from 'firebase/storage';

import { getStorageBucket } from './firebase-clients';

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/**
 * Resolves a Storage object path to a signed download URL.
 *
 * `getDownloadURL` counts as download egress, so results are memoised
 * in-process and re-validated against the object's metadata: once the image is
 * replaced the cached URL stops working and we fetch a fresh one.
 */
const urlCache = new Map<string, { url: string; generation: string }>();

export async function resolveStorageUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (isAbsoluteUrl(path)) return path;

  const storageRef = ref(getStorageBucket(), path);
  const cached = urlCache.get(path);

  if (cached) {
    const metadata = await getMetadata(storageRef).catch(() => null);
    if (metadata?.generation && metadata.generation === cached.generation) {
      return cached.url;
    }
  }

  const [url, metadata] = await Promise.all([getDownloadURL(storageRef), getMetadata(storageRef)]);
  urlCache.set(path, { url, generation: metadata.generation });
  return url;
}
