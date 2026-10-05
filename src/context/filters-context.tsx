import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useDebouncedValue } from '../hooks/use-debounced-value';
import { stateName } from '../data/states';
import type { Filters, PriceBandFilter, RatingFilter, Restaurant, SortKey } from '../types/food';
import { matchesPriceBand, matchesSearch, SORTERS } from '../utils/format';

const STORAGE_KEY = 'zomato-clone:filters';

export const DEFAULT_FILTERS: Filters = {
  search: '',
  state: '',
  cuisines: [],
  rating: 0,
  priceBand: 0,
  pureVegOnly: false,
  sort: 'rating',
};

/** Reads persisted filters once, tolerating corrupted localStorage values. */
function loadFilters(): Filters {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<Filters>;
    return {
      ...DEFAULT_FILTERS,
      ...parsed,
      cuisines: Array.isArray(parsed.cuisines) ? parsed.cuisines : [],
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

interface FiltersContextValue {
  filters: Filters;
  /** Debounced copy of `filters.search`, used for the actual filtering. */
  debouncedSearch: string;
  /** Restaurants from the catalogue that match the current filters. */
  visibleRestaurants: Restaurant[];
  /** Distinct cuisines across the whole catalogue. */
  cuisines: string[];
  /** Cities that have restaurants in the selected state. */
  cities: string[];
  isFiltered: boolean;
  update: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggleCuisine: (cuisine: string) => void;
  reset: () => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

/**
 * Filter state lives above the router so the header search box and the filter
 * bar on the home page read and write the same values.
 */
export function FiltersProvider({ restaurants, children }: { restaurants: Restaurant[]; children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(loadFilters);
  const debouncedSearch = useDebouncedValue(filters.search, 250);

  const persist = useCallback((next: Filters) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode / quota exceeded — filters still work for this session.
    }
  }, []);

  const update = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggleCuisine = useCallback(
    (cuisine: string) => {
      setFilters((prev) => {
        const cuisines = prev.cuisines.includes(cuisine)
          ? prev.cuisines.filter((item) => item !== cuisine)
          : [...prev.cuisines, cuisine];
        const next = { ...prev, cuisines };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    persist(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  }, [persist]);

  const { state, cuisines, rating, priceBand, pureVegOnly, sort } = filters;

  // Pure derivation of the visible list — memoised so sorting runs only when the
  // inputs actually change.
  const visibleRestaurants = useMemo(() => {
    const filtered = restaurants.filter((restaurant) => {
      if (!matchesSearch(restaurant, debouncedSearch)) return false;
      if (state && restaurant.state !== stateName(state)) return false;
      if (cuisines.length > 0 && !restaurant.cuisines.some((cuisine) => cuisines.includes(cuisine))) return false;
      if (rating > 0 && restaurant.rating < rating) return false;
      if (!matchesPriceBand(restaurant, priceBand)) return false;
      if (pureVegOnly && !restaurant.pureVeg) return false;
      return true;
    });

    return [...filtered].sort(SORTERS[sort]);
  }, [restaurants, debouncedSearch, state, cuisines, rating, priceBand, pureVegOnly, sort]);

  /** Cities available in the selected state, used as the header subtitle. */
  const cities = useMemo(() => {
    const list = state ? restaurants.filter((r) => r.state === stateName(state)) : restaurants;
    return [...new Set(list.map((r) => r.city))].sort((a, b) => a.localeCompare(b));
  }, [restaurants, state]);

  // Cuisine facets come from the loaded documents, so a Firestore-only cuisine
  // still shows up in the filter list.
  const allCuisines = useMemo(
    () => Array.from(new Set(restaurants.flatMap((restaurant) => restaurant.cuisines))).sort((a, b) => a.localeCompare(b)),
    [restaurants],
  );

  const isFiltered =
    cuisines.length > 0 ||
    state !== '' ||
    rating > 0 ||
    priceBand > 0 ||
    pureVegOnly ||
    filters.search.trim().length > 0;

  const value = useMemo<FiltersContextValue>(
    () => ({
      filters,
      debouncedSearch,
      visibleRestaurants,
      cuisines: allCuisines,
      cities,
      isFiltered,
      update,
      toggleCuisine,
      reset,
    }),
    [filters, debouncedSearch, visibleRestaurants, allCuisines, cities, isFiltered, update, toggleCuisine, reset],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters(): FiltersContextValue {
  const context = useContext(FiltersContext);
  if (!context) throw new Error('useFilters must be used inside <FiltersProvider>');
  return context;
}

export type { PriceBandFilter, RatingFilter, SortKey };
