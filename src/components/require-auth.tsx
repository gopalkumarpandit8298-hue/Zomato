import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/auth-context';
import { SpinnerIcon } from './icons';

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Client-side gate for /checkout and /orders.
 *
 * This is UX only — the real enforcement is in `firestore.rules`, which rejects
 * any order whose `userId` does not match the signed-in uid. Hiding a link is
 * never a security control.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, status } = useAuth();
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
    // `state.from` lets the login page send the user back where they were.
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <>{children}</>;
}
