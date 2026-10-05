import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ClockIcon, LeafIcon, SpinnerIcon, StarIcon } from '../components/icons';
import { MenuItemCard, VegMarker } from '../components/menu-item-card';
import { useCart } from '../context/cart-context';
import { useImageUrl } from '../hooks/use-image-url';
import { demoRestaurants } from '../data/seed';
import { getDemoMenu } from '../data/menu';
import { isFirebaseConfigured } from '../lib/firebase-app';
import { formatCompactCount, formatInr, priceBandGlyph, ratingColor } from '../utils/format';
import { cn } from '../utils/cn';
import type { MenuItem, Restaurant } from '../types/food';

function useRestaurant(id: string | undefined): Restaurant | null {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (!id) {
      setRestaurant(null);
      return;
    }
    // The catalogue is small and already cached by the home page, so the
    // bundled copy is enough to render the header immediately.
    setRestaurant(demoRestaurants.find((item) => item.id === id) ?? null);
  }, [id]);

  return restaurant;
}

function useMenu(restaurantId: string | undefined, restaurant: Restaurant | null) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'demo'>('loading');

  useEffect(() => {
    if (!restaurantId) return;

    let active = true;

    if (!isFirebaseConfigured) {
      setItems(getDemoMenu(restaurantId));
      setStatus('demo');
      return;
    }

    import('../lib/menu-repository')
      .then(({ fetchMenu }) => fetchMenu(restaurantId))
      .then((menu) => {
        if (!active) return;
        setItems(menu.length > 0 ? menu : getDemoMenu(restaurantId));
        setStatus(menu.length > 0 ? 'ready' : 'demo');
      })
      .catch(() => {
        if (!active) return;
        setItems(getDemoMenu(restaurantId));
        setStatus('demo');
      });

    return () => {
      active = false;
    };
  }, [restaurantId]);

  return { items, status, restaurantName: restaurant?.name ?? '' };
}

export default function RestaurantPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const restaurant = useRestaurant(restaurantId);
  const { items, status } = useMenu(restaurantId, restaurant);
  const { itemCount, totals } = useCart();
  const imageUrl = useImageUrl(restaurant?.imagePath ?? '', restaurant?.fallbackImageUrl ?? '');

  if (!restaurant) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-bold text-neutral-900">Restaurant not found</h1>
        <p className="mt-2 text-sm text-neutral-500">It may have been removed from the catalogue.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <header className="relative h-56 overflow-hidden bg-neutral-200 sm:h-72">
        <img src={imageUrl} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/35 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <VegMarker veg={restaurant.pureVeg} className="border-white/70 bg-white/90" />
                {restaurant.pureVeg && (
                  <span className="inline-flex items-center gap-1 rounded bg-white/90 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <LeafIcon className="size-3.5" />
                    Pure veg
                  </span>
                )}
              </div>

              <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{restaurant.name}</h1>
              <p className="mt-1 text-sm text-neutral-200">
                {restaurant.cuisines.join(', ')} · {restaurant.area}
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm text-white">
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="size-4 text-emerald-400" />
                {restaurant.deliveryMinutes} min
              </span>
              <span className="font-semibold">{priceBandGlyph(restaurant.costForTwo)}</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold',
                  ratingColor(restaurant.rating),
                )}
              >
                <StarIcon className="size-3.5" />
                {restaurant.rating.toFixed(1)}
                <span className="font-medium">({formatCompactCount(restaurant.ratingCount)})</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">
            {status === 'loading' ? 'Menu' : `${items.length} item${items.length === 1 ? '' : 's'}`}
          </h2>
          {itemCount > 0 && (
            <Link to="/cart" className="text-sm font-semibold text-brand-600 hover:underline">
              {itemCount} item{itemCount === 1 ? '' : 's'} in cart
            </Link>
          )}
        </div>

        {status === 'loading' ? (
          <div className="mt-4 grid place-items-center py-16">
            <SpinnerIcon className="size-8 text-neutral-400" />
            <span className="sr-only">Loading menu</span>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <MenuItemCard item={item} restaurant={restaurant} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {status === 'demo' && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Showing the bundled menu. Run <code className="font-mono">npm run seed</code> to publish menus to Firestore.
        </p>
      )}

      {/* Sticky "go to cart" bar, the way Zomato keeps checkout one tap away. */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <span className="text-sm font-semibold text-neutral-700">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </span>
            <Link
              to="/cart"
              className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              Go to cart · {formatInr(totals.total)}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
