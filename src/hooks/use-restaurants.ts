import { useEffect, useState } from 'react';

import { demoRestaurants } from '../data/seed';
import { isFirebaseConfigured } from '../lib/firebase-app';
import type { RestaurantsResult } from '../types/food';

/**
 * `onSnapshot` opens a long-lived connection and *retries* instead of failing,
 * so an unreachable Firestore (API disabled, wrong project, offline) would
 * otherwise leave the UI on skeletons forever. After this timeout we fall back
 * to the bundled catalogue while keeping the subscription alive in the
 * background — if data arrives later the UI switches over automatically.
 */
const FIRST_SNAPSHOT_TIMEOUT_MS = 8000;

const INITIAL: RestaurantsResult = {
  status: 'loading',
  restaurants: [],
  error: null,
  isDemoData: true,
};

const DEMO_MISSING_KEYS: RestaurantsResult = {
  status: 'demo',
  restaurants: demoRestaurants,
  error: 'Firebase keys missing — showing bundled demo data. Copy `.env.example` to `.env` and add your keys.',
  isDemoData: true,
};

/**
 * Streams restaurants from Firestore with `onSnapshot`.
 *
 * Degrades gracefully in the three situations a fresh project always hits:
 *  - no `.env` keys -> bundled demo data
 *  - Firestore unreachable / slow -> bundled demo data after a short timeout
 *  - collection empty or read denied -> bundled demo data + an explanation
 *
 * `firebase/firestore` is dynamically imported so the SDK is not in the initial
 * bundle; it is only fetched once the app knows Firebase is configured.
 */
export function useRestaurants(): RestaurantsResult {
  const [state, setState] = useState<RestaurantsResult>(INITIAL);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setState(DEMO_MISSING_KEYS);
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;
    let settled = false;

    const stopWaiting = () => {
      settled = true;
      clearTimeout(firstSnapshotTimer);
    };

    const firstSnapshotTimer = setTimeout(() => {
      if (!active || settled) return;
      console.warn(
        `[zomato-clone] No Firestore snapshot within ${FIRST_SNAPSHOT_TIMEOUT_MS}ms — showing bundled demo data.`,
      );
      setState({
        status: 'demo',
        restaurants: demoRestaurants,
        error: 'Firestore did not respond — showing bundled demo data.',
        isDemoData: true,
      });
    }, FIRST_SNAPSHOT_TIMEOUT_MS);

    setState((prev) => ({ ...prev, status: 'loading' }));

    import('../lib/restaurant-repository')
      .then(({ subscribeToRestaurants }) => {
        if (!active) return;

        unsubscribe = subscribeToRestaurants(
          (restaurants) => {
            if (!active) return;
            stopWaiting();
            setState(
              restaurants.length > 0
                ? { status: 'ready', restaurants, error: null, isDemoData: false }
                : {
                    status: 'demo',
                    restaurants: demoRestaurants,
                    error: 'Firestore collection `restaurants` is empty — run `npm run seed`.',
                    isDemoData: true,
                  },
            );
          },
          (error) => {
            if (!active) return;
            stopWaiting();
            setState({ status: 'error', restaurants: demoRestaurants, error: error.message, isDemoData: true });
          },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        stopWaiting();
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: 'error', restaurants: demoRestaurants, error: message, isDemoData: true });
      });

    return () => {
      active = false;
      clearTimeout(firstSnapshotTimer);
      unsubscribe?.();
    };
  }, []);

  return state;
}
