/**
 * Bundled demo data. Used when `.env` has no Firebase keys yet, or when
 * Firestore rejects the read (rules not deployed / offline).
 *
 * Single source of truth: the same JSON files drive `npm run seed`.
 */
import categoriesJson from '../data/categories.json';
import restaurantsJson from '../data/restaurants.json';
import type { Category, Restaurant } from '../types/food';

export const demoRestaurants: Restaurant[] = (restaurantsJson as unknown as { restaurants: Restaurant[] }).restaurants;

export const categories: Category[] = (categoriesJson as unknown as { categories: Category[] }).categories;
