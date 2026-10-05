import { collection, getDocs, orderBy, query } from 'firebase/firestore';

import { getDb } from './firebase-clients';
import type { MenuItem } from '../types/food';

/** Menus are small and per-restaurant, so one read of the subcollection is enough. */
export async function fetchMenu(restaurantId: string): Promise<MenuItem[]> {
  const menuRef = collection(getDb(), 'restaurants', restaurantId, 'menu');
  const snapshot = await getDocs(query(menuRef, orderBy('name', 'asc')));

  return snapshot.docs.map((snapshotDoc) => {
    const data = snapshotDoc.data();
    return {
      id: snapshotDoc.id,
      restaurantId,
      name: typeof data.name === 'string' ? data.name : 'Unnamed dish',
      description: typeof data.description === 'string' ? data.description : '',
      price: typeof data.price === 'number' ? data.price : 0,
      veg: data.veg === true,
      spicy: data.spicy === true,
      popular: data.popular === true,
    };
  });
}
