import { useEffect } from 'react';
import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { AppFooter } from './app-footer';
import { AppHeader } from './app-header';
import { SpinnerIcon } from './icons';
import { FiltersProvider } from '../context/filters-context';
import { useRestaurants } from '../hooks/use-restaurants';

/**
 * The shell shared by every route. It reads the catalogue once so the header can
 * show the delivery city and the demo/live badge, and provides the filter state
 * that the header search box and the home page filter bar both read from.
 */
export function AppLayout() {
  const { restaurants, isDemoData } = useRestaurants();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop pathname={location.pathname} />

      {/* The header search box and the home page filter bar share one filter
          state, so the provider has to wrap both. */}
      <FiltersProvider restaurants={restaurants}>
        <AppHeader isDemoData={isDemoData} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4">
          <Suspense
            fallback={
              <div className="grid place-items-center py-32">
                <SpinnerIcon className="size-8 text-neutral-400" />
                <span className="sr-only">Loading page</span>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        <AppFooter />
      </FiltersProvider>
    </div>
  );
}

/** Resets the scroll position on navigation, the way a real multi-page site behaves. */
function ScrollToTop({ pathname }: { pathname: string }) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
