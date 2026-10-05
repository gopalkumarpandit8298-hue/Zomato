import { useCallback, useState } from 'react';

import { CategoryChips } from '../components/category-chips';
import { EmptyState } from '../components/empty-state';
import { FilterBar } from '../components/filter-bar';
import { Hero } from '../components/hero';
import { NoticeBanner } from '../components/notice-banner';
import { RestaurantCard } from '../components/restaurant-card';
import { RestaurantGridSkeleton } from '../components/restaurant-grid-skeleton';
import { useFilters } from '../context/filters-context';
import { stateName } from '../data/states';
import { useRestaurants } from '../hooks/use-restaurants';
import type { PriceBandFilter, RatingFilter, SortKey } from '../types/food';

/** Maps a category chip id to the cuisine value stored on Firestore documents. */
const CATEGORY_TO_CUISINE: Record<string, string> = {
  biryani: 'Biryani',
  pizza: 'Pizza',
  burger: 'Burger',
  momos: 'Momos',
  desserts: 'Desserts',
  healthy: 'Healthy',
  rolls: 'Rolls',
  beverages: 'Beverages',
};

export default function HomePage() {
  const { status, error, isDemoData } = useRestaurants();
  const { filters, visibleRestaurants, cuisines, update, toggleCuisine, reset, isFiltered, debouncedSearch } =
    useFilters();
  const [activeCategory, setActiveCategory] = useState('all');
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);

  const isLoading = status === 'loading';
  const notice = error && error !== dismissedNotice ? error : null;

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      if (categoryId === activeCategory) return;
      setActiveCategory(categoryId);
      // The chip rail and the cuisine filters are two views of the same facet.
      if (categoryId === 'all') {
        if (filters.cuisines.length > 0) reset();
        return;
      }
      const cuisine = CATEGORY_TO_CUISINE[categoryId] ?? categoryId;
      if (!filters.cuisines.includes(cuisine)) toggleCuisine(cuisine);
    },
    [activeCategory, filters.cuisines, reset, toggleCuisine],
  );

  return (
    <div>
      <Hero />

      <div className="mt-6">
        <CategoryChips activeCategory={activeCategory} onSelect={handleCategorySelect} />
      </div>

      <div className="mt-4 space-y-4">
        {notice && <NoticeBanner message={notice} onDismiss={() => setDismissedNotice(notice)} />}

        <FilterBar
          cuisines={cuisines}
          rating={filters.rating}
          priceBand={filters.priceBand}
          pureVegOnly={filters.pureVegOnly}
          sort={filters.sort}
          activeCuisines={filters.cuisines}
          isFiltered={isFiltered}
          resultCount={visibleRestaurants.length}
          onRatingChange={(value: RatingFilter) => update('rating', value)}
          onPriceBandChange={(value: PriceBandFilter) => update('priceBand', value)}
          onPureVegChange={(value: boolean) => update('pureVegOnly', value)}
          onSortChange={(value: SortKey) => update('sort', value)}
          onToggleCuisine={toggleCuisine}
          onReset={reset}
        />

        {isLoading ? (
          <RestaurantGridSkeleton />
        ) : visibleRestaurants.length === 0 ? (
          <EmptyState
            query={debouncedSearch}
            hint={
              filters.state && !debouncedSearch
                ? `We do not deliver to ${stateName(filters.state)} yet.`
                : undefined
            }
            onReset={() => {
              reset();
              setActiveCategory('all');
            }}
          />
        ) : (
          <>
            <p className="text-sm font-semibold text-neutral-700">
              {visibleRestaurants.length} restaurant{visibleRestaurants.length === 1 ? '' : 's'} near you
            </p>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleRestaurants.map((restaurant) => (
                <li key={restaurant.id} className="contents">
                  <RestaurantCard restaurant={restaurant} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {isDemoData ? 'Showing demo data.' : 'Showing live data.'}
      </p>
    </div>
  );
}
