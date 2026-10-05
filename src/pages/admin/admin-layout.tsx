import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { RequireAdmin } from '../../components/require-admin';
import { useAuth } from '../../context/auth-context';
import { cn } from '../../utils/cn';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/restaurants', label: 'Restaurants', end: false },
  { to: '/admin/orders', label: 'Orders', end: false },
  { to: '/admin/customers', label: 'Customers', end: false },
];

/** Chrome for the guarded /admin/* routes: a top bar plus the nested outlet. */
export function AdminLayout() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <RequireAdmin>
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
            <Link to="/" className="shrink-0">
              <span className="text-xl font-extrabold tracking-tight text-brand-600">zomato</span>
              <span className="ml-1.5 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                Admin
              </span>
            </Link>

            <span className="ml-auto hidden text-sm text-neutral-500 sm:block">{user?.email}</span>
            <button
              type="button"
              onClick={() => {
                setSigningOut(true);
                void signOut();
              }}
              disabled={signingOut}
              className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:bg-neutral-100"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>

          <nav aria-label="Admin sections" className="mx-auto max-w-7xl px-4">
            <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'inline-block border-b-2 px-3 py-2.5 text-sm font-semibold transition',
                        isActive
                          ? 'border-brand-600 text-brand-700'
                          : 'border-transparent text-neutral-500 hover:text-neutral-800',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4">
          <Outlet />
        </main>
      </div>
    </RequireAdmin>
  );
}
