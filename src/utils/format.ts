import type { PriceBandFilter, Restaurant, SortKey } from '../types/food';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatInr = (value: number): string => inrFormatter.format(value);

/** 2412 -> "2.4K", 940 -> "940" */
export function formatCompactCount(value: number): string {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : Number(thousands.toFixed(1))}K`;
}

export const ratingColor = (rating: number): string => {
  if (rating >= 4.5) return 'bg-emerald-600';
  if (rating >= 4) return 'bg-green-700';
  if (rating >= 3.5) return 'bg-amber-600';
  return 'bg-rose-700';
};

/** ₹₹₹ style indicator, matching Zomato's budget hint. */
export function priceBandGlyph(costForTwo: number): string {
  if (costForTwo <= 300) return '₹';
  if (costForTwo <= 600) return '₹₹';
  return '₹₹₹';
}

export function matchesPriceBand(restaurant: Restaurant, band: PriceBandFilter): boolean {
  if (band === 0) return true;
  const glyph = priceBandGlyph(restaurant.costForTwo);
  return glyph.length === band;
}

export const SORT_LABELS: Record<SortKey, string> = {
  rating: 'Rating (high to low)',
  delivery: 'Delivery time (low to high)',
  'cost-asc': 'Cost (low to high)',
  'cost-desc': 'Cost (high to low)',
};

/** Lowercases and strips accents so "cafe" matches "Café". */
const fold = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Case- and accent-insensitive "contains" used by the search box. */
export function matchesSearch(restaurant: Restaurant, term: string): boolean {
  const needle = fold(term.trim());
  if (!needle) return true;
  return [restaurant.name, restaurant.area, restaurant.city, ...restaurant.cuisines].some((field) =>
    fold(field).includes(needle),
  );
}

export const SORTERS: Record<SortKey, (a: Restaurant, b: Restaurant) => number> = {
  rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
  delivery: (a, b) => a.deliveryMinutes - b.deliveryMinutes,
  'cost-asc': (a, b) => a.costForTwo - b.costForTwo,
  'cost-desc': (a, b) => b.costForTwo - a.costForTwo,
};
