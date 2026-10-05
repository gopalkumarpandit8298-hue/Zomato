import { useEffect, useState } from 'react';

import { isStorageEnabled } from '../lib/firebase-app';

/**
 * Resolves an image to a displayable URL.
 *
 * Cloud Storage is the primary source, but it is gated behind
 * `VITE_FIREBASE_STORAGE_ENABLED`; without a bucket every lookup would fail, so
 * `fallbackImageUrl` (the local `/img/` copy) is used directly instead of
 * firing requests that are guaranteed to error.
 *
 * `firebase/storage` is imported dynamically so the SDK sits in a separate
 * chunk that is only fetched when it is actually needed.
 */
export function useImageUrl(imagePath: string, fallbackImageUrl: string): string {
  const [url, setUrl] = useState<string>(fallbackImageUrl);

  useEffect(() => {
    if (!isStorageEnabled || !imagePath) {
      setUrl(fallbackImageUrl);
      return;
    }

    let active = true;

    import('../lib/storage-images')
      .then(({ resolveStorageUrl }) => resolveStorageUrl(imagePath))
      .then((resolved) => {
        if (active && resolved) setUrl(resolved);
      })
      .catch(() => {
        // Object missing (seed not run) or rules not deployed -> local copy.
        if (active) setUrl(fallbackImageUrl);
      });

    return () => {
      active = false;
    };
  }, [imagePath, fallbackImageUrl]);

  return url;
}
