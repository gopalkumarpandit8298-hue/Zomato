/**
 * Bundled menus, mirroring the `restaurants/{id}/menu` subcollection written by
 * `npm run seed`. Used when Firestore is unconfigured or unreachable so the
 * cart and checkout flow stays demoable offline.
 */
import menuJson from '../data/menu.json';
import type { MenuItem } from '../types/food';

interface MenuRecord {
  id: string;
  name: string;
  description: string;
  price: number;
  veg: boolean;
  spicy: boolean;
  popular: boolean;
}

const menus = menuJson as unknown as Record<string, MenuRecord[]>;

/** Restaurants whose menu could not be loaded from Firestore fall back to this. */
export function getDemoMenu(restaurantId: string): MenuItem[] {
  return (menus[restaurantId] ?? []).map((item) => ({ ...item, restaurantId }));
}

export const hasDemoMenu = (restaurantId: string): boolean => Array.isArray(menus[restaurantId]);
