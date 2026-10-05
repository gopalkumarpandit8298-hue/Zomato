import { cn } from '../utils/cn';
import { SORT_LABELS } from '../utils/format';
import { CloseIcon, LeafIcon, SlidersIcon } from './icons';
import type { PriceBandFilter, RatingFilter, SortKey } from '../types/food';

const RATING_OPTIONS: Array<{ value: RatingFilter; label: string }> = [
  { value: 0, label: 'Any rating' },
  { value: 4, label: '4.0+ stars' },
  { value: 4.5, label: '4.5+ stars' },
];

const PRICE_OPTIONS: Array<{ value: PriceBandFilter; label: string }> = [
  { value: 0, label: 'Any price' },
  { value: 1, label: '₹ Under 300' },
  { value: 2, label: '₹₹ 300 – 600' },
  { value: 3, label: '₹₹₹ Above 600' },
];

interface FilterBarProps {
  /** Derived from the loaded documents, not hardcoded. */
  cuisines: string[];
  rating: RatingFilter;
  priceBand: PriceBandFilter;
  pureVegOnly: boolean;
  sort: SortKey;
  activeCuisines: string[];
  isFiltered: boolean;
  resultCount: number;
  onRatingChange: (value: RatingFilter) => void;
  onPriceBandChange: (value: PriceBandFilter) => void;
  onPureVegChange: (value: boolean) => void;
  onSortChange: (value: SortKey) => void;
  onToggleCuisine: (cuisine: string) => void;
  onReset: () => void;
}

export function FilterBar({
  cuisines,
  rating,
  priceBand,
  pureVegOnly,
  sort,
  activeCuisines,
  isFiltered,
  resultCount,
  onRatingChange,
  onPriceBandChange,
  onPureVegChange,
  onSortChange,
  onToggleCuisine,
  onReset,
}: FilterBarProps) {
  return (
    <section
      aria-label="Filter and sort restaurants"
      // Sticks just below the header. The header is ~73px on desktop but grows
      // to ~117px on mobile because the search input moves into its own row, so
      // a single offset would slide this bar behind the header on phones.
      className="sticky top-[7.5rem] z-20 -mx-4 border-y border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur-md md:top-[4.75rem]"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SlidersIcon className="size-5 shrink-0 text-neutral-500" />

          <select
            aria-label="Sort restaurants"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
            className="h-9 shrink-0 rounded-full border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by rating"
            value={rating}
            onChange={(event) => onRatingChange(Number(event.target.value) as RatingFilter)}
            className="h-9 shrink-0 rounded-full border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
          >
            {RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by price"
            value={priceBand}
            onChange={(event) => onPriceBandChange(Number(event.target.value) as PriceBandFilter)}
            className="h-9 shrink-0 rounded-full border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
          >
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            aria-pressed={pureVegOnly}
            onClick={() => onPureVegChange(!pureVegOnly)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition',
              'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none',
              pureVegOnly
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400',
            )}
          >
            <LeafIcon className="size-4" />
            Pure veg
          </button>

          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              <CloseIcon className="size-4" />
              Clear all
            </button>
          )}
        </div>

        {activeCuisines.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Selected cuisines">
            {activeCuisines.map((cuisine) => (
              <li key={cuisine}>
                <button
                  type="button"
                  onClick={() => onToggleCuisine(cuisine)}
                  className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-200"
                >
                  {cuisine}
                  <CloseIcon className="size-3.5" />
                  <span className="sr-only">Remove {cuisine} filter</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {resultCount} restaurants
      </p>

      {/* Cuisine filters are secondary; keep them keyboard reachable but out of the tab flow storm. */}
      <details className="mt-3 group">
        <summary className="cursor-pointer text-sm font-semibold text-brand-600 hover:underline">All cuisines</summary>
        <ul className="mt-2 flex flex-wrap gap-2">
          {cuisines.map((cuisine) => (
            <li key={cuisine}>
              <button
                type="button"
                aria-pressed={activeCuisines.includes(cuisine)}
                onClick={() => onToggleCuisine(cuisine)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  activeCuisines.includes(cuisine)
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400',
                )}
              >
                {cuisine}
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
