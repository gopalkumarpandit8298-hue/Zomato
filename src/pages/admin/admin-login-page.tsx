import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { SpinnerIcon } from '../../components/icons';
import { useAuth } from '../../context/auth-context';

export default function AdminLoginPage() {
  const { user, status, isAdmin, signInWithPassword, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  useEffect(() => {
    if (status === 'ready' && user && isAdmin) navigate(from, { replace: true });
  }, [status, user, isAdmin, from, navigate]);

  if (status === 'ready' && user && isAdmin) return <Navigate to={from} replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter both email and password.');
      return;
    }

    setBusy(true);
    try {
      await signInWithPassword(email, password);
      // onAuthStateChanged will flip `isAdmin` and the effect above redirects.
    } catch (cause) {
      const { describeAuthError } = await import('../../lib/auth-repository');
      setError(describeAuthError(cause));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-10 py-12 md:grid-cols-2 md:items-center">
      <div>
        <p className="text-xs font-bold tracking-widest text-brand-600 uppercase">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">
          Control panel for zomato-clone
        </h1>
        <p className="mt-3 text-neutral-600">
          Manage restaurants, review every order and follow revenue. Staff accounts sign in with an
          email address and password.
        </p>

        <ul className="mt-6 space-y-2 text-sm text-neutral-700">
          {['Add, edit and remove restaurants', 'Move orders through their delivery status', 'Track revenue and customers'].map(
            (item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  ✓
                </span>
                {item}
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900">Sign in</h2>

        {user && !isAdmin && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Signed in as {user.email}, which is not an admin address.
            <button type="button" onClick={() => void signOut()} className="ml-2 font-semibold underline">
              Use a different account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-neutral-700">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-neutral-700">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:bg-neutral-300"
          >
            {busy ? (
              <>
                <SpinnerIcon className="size-4" />
                Signing in…
              </>
            ) : (
              'Sign in to admin'
            )}
          </button>
        </form>

        <p className="mt-5 border-t border-neutral-100 pt-4 text-center text-xs text-neutral-400">
          Access is granted by email allow-list only. Credentials are verified by Firebase Auth.
        </p>

        <div className="mt-3 text-center">
          <Link to="/" className="text-sm font-semibold text-brand-600 hover:underline">
            Back to the customer site
          </Link>
        </div>
      </div>
    </div>
  );
}
