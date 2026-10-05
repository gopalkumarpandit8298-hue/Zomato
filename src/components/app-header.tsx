import { Link, NavLink } from 'react-router-dom';

import { useAuth } from '../context/auth-context';
import { useCart } from '../context/cart-context';
import { useFilters } from '../context/filters-context';
import { cn } from '../utils/cn';
import { LocationPicker, LocationPickerMobile } from './location-picker';
import { SpinnerIcon } from './icons';
import { SearchBar } from './search-bar';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AppHeader({ isDemoData }: { isDemoData: boolean }) {
  const { user, status, signIn, signOut } = useAuth();
  const { itemCount } = useCart();
  const { filters, update, visibleRestaurants } = useFilters();

  const searchProps = {
    value: filters.search,
    onChange: (value: string) => update('search', value),
    onClear: () => update('search', ''),
    resultCount: visibleRestaurants.length,
  };

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="shrink-0" aria-label="zomato clone home">
          <span className="text-2xl font-extrabold tracking-tight text-brand-600">zomato</span>
          <span className="ml-1.5 text-xs font-medium text-neutral-400">clone</span>
        </Link>

        <LocationPicker />

        <div className="ml-auto hidden w-full max-w-xl md:block">
          <SearchBar {...searchProps} />
        </div>

        <NavLink
          to="/cart"
          className={({ isActive }) =>
            cn(
              'relative flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition',
              isActive
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-neutral-300 text-neutral-700 hover:border-neutral-400',
            )
          }
        >
          Cart
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
              {itemCount > 99 ? '99+' : itemCount}
              <span className="sr-only">items in cart</span>
            </span>
          )}
        </NavLink>

        <span
          title={isDemoData ? 'Bundled demo data — Firestore is not reachable' : 'Live data from Cloud Firestore'}
          className={cn(
            'hidden shrink-0 rounded-full px-3 py-1 text-xs font-semibold lg:inline-block',
            isDemoData ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
          )}
        >
          {isDemoData ? 'Demo data' : 'Firestore live'}
        </span>

        {status === 'loading' ? (
          <SpinnerIcon className="size-5 shrink-0 text-neutral-400" />
        ) : user ? (
          <div className="flex shrink-0 items-center gap-2">
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                cn(
                  'hidden rounded-full px-3 py-1.5 text-sm font-semibold transition sm:block',
                  isActive ? 'text-brand-700' : 'text-neutral-700 hover:text-neutral-500',
                )
              }
            >
              Orders
            </NavLink>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-full border border-neutral-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
              >
                {initials(user.displayName)}
              </span>
            )}
            <span className="hidden max-w-28 truncate text-sm font-semibold text-neutral-800 lg:block">
              {user.displayName}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:border-neutral-400"
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void signIn()}
            className="shrink-0 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Log in
          </button>
        )}
      </div>

      <div className="space-y-2 px-4 pb-3 md:hidden">
        <div className="flex items-center justify-between">
          <LocationPickerMobile />
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
              isDemoData ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
            )}
          >
            {isDemoData ? 'Demo data' : 'Firestore live'}
          </span>
        </div>
        <SearchBar {...searchProps} />
      </div>
    </header>
  );
}
