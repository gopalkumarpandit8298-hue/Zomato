import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { getDb } from './firebase-clients';
import type { Restaurant } from '../types/food';

const COLLECTION = 'restaurants';

/** Hard cap so a misconfigured Firestore can never blow up the browser. */
const MAX_DOCUMENTS = 60;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Firestore is schemaless, so every field is coerced defensively. A single
 * malformed document degrades that one card instead of crashing the grid.
 */
export function mapRestaurantDoc(snapshot: QueryDocumentSnapshot<DocumentData>): Restaurant {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: asString(data.name, 'Unknown restaurant'),
    cuisines: asStringArray(data.cuisines),
    rating: asNumber(data.rating),
    ratingCount: asNumber(data.ratingCount),
    deliveryMinutes: asNumber(data.deliveryMinutes),
    costForTwo: asNumber(data.costForTwo),
    area: asString(data.area),
    city: asString(data.city),
    state: asString(data.state),
    pureVeg: asBoolean(data.pureVeg),
    discount: typeof data.discount === 'string' && data.discount.length > 0 ? data.discount : null,
    featured: asBoolean(data.featured),
    imagePath: asString(data.imagePath, `restaurants/${snapshot.id}.jpg`),
    fallbackImageUrl: asString(data.fallbackImageUrl),
  };
}

/** One-shot read. Used by the seed script and as a non-reactive fallback. */
export async function fetchRestaurants(): Promise<Restaurant[]> {
  const q = query(collection(getDb(), COLLECTION), orderBy('rating', 'desc'), limit(MAX_DOCUMENTS));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapRestaurantDoc);
}

/**
 * Live subscription — Firestore pushes updates, so a new restaurant appears
 * without a page refresh.
 *
 * @returns an unsubscribe function; call it in the effect cleanup.
 */
export function subscribeToRestaurants(
  onNext: (restaurants: Restaurant[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(getDb(), COLLECTION), orderBy('rating', 'desc'), limit(MAX_DOCUMENTS));
  return onSnapshot(
    q,
    (snapshot) => onNext(snapshot.docs.map(mapRestaurantDoc)),
    (error) => onError(error instanceof Error ? error : new Error(String(error))),
  );
}
