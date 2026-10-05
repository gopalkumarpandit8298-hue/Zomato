import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/auth-context';
import { SpinnerIcon } from './icons';

/**
 * Client-side gate for /admin/*.
 *
 * UX only — `firestore.rules` re-checks the same email allow-list on every
 * request, so a user who edits this bundle gains nothing.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, status, isAdmin } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="grid place-items-center py-24">
        <SpinnerIcon className="size-8 text-neutral-400" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-extrabold text-neutral-900">Access denied</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {user.email} is signed in, but this account is not on the admin allow-list.
        </p>
        <p className="mt-4 text-xs text-neutral-500">
          Ask an owner to add the address to <code className="font-mono">VITE_ADMIN_EMAILS</code> and redeploy.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
