import { memo } from 'react';
import { Link } from 'react-router-dom';

import { useImageUrl } from '../hooks/use-image-url';
import { cn } from '../utils/cn';
import { formatCompactCount, formatInr, priceBandGlyph, ratingColor } from '../utils/format';
import { ClockIcon, LeafIcon, StarIcon } from './icons';
import type { Restaurant } from '../types/food';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

function RestaurantCardComponent({ restaurant }: RestaurantCardProps) {
  const imageUrl = useImageUrl(restaurant.imagePath, restaurant.fallbackImageUrl);
  const { id, name, cuisines, area, rating, ratingCount, deliveryMinutes, costForTwo, discount, pureVeg } = restaurant;

  return (
    <article className="group h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      {/* The whole card is one link: keyboard users get a single stop per
          restaurant instead of a pile of nested focusable elements. */}
      <Link
        to={`/restaurant/${id}`}
        aria-label={`${name}, ${cuisines.join(', ')}, rated ${rating} out of 5`}
        className="block h-full focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-200">
          <img
            src={imageUrl}
            alt={`${name} — ${cuisines.join(', ')}`}
            loading="lazy"
            decoding="async"
            width={640}
            height={400}
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />

          {discount && (
            <span className="absolute top-3 left-3 rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-brand-600 shadow-sm">
              {discount}
            </span>
          )}

          {pureVeg && (
            <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-md bg-white/95 shadow-sm">
              <LeafIcon className="size-4 text-emerald-600" />
              <span className="sr-only">Pure vegetarian</span>
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-white shadow-sm',
                ratingColor(rating),
              )}
            >
              <StarIcon className="size-3.5" />
              {rating.toFixed(1)}
              <span className="font-medium">({formatCompactCount(ratingCount)})</span>
            </span>
            <span className="rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-neutral-800 shadow-sm">
              {formatInr(costForTwo)} for two
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="truncate text-[17px] font-semibold text-neutral-900">{name}</h3>
          <p className="mt-0.5 truncate text-sm text-neutral-500">{cuisines.join(', ')}</p>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
              <ClockIcon className="size-4 text-emerald-600" />
              {deliveryMinutes} min
            </span>
            <span className="font-semibold text-neutral-500">{priceBandGlyph(costForTwo)}</span>
          </div>

          <p className="mt-2 truncate text-xs text-neutral-400">{area}</p>
        </div>
      </Link>
    </article>
  );
}

/** Memoised: the grid re-renders on every keystroke, cards should not. */
export const RestaurantCard = memo(RestaurantCardComponent);
