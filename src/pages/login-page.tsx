import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { SpinnerIcon } from '../components/icons';
import { useAuth } from '../context/auth-context';

const BENEFITS = [
  'Check out in seconds with your saved address',
  'Track every order in real time',
  'Keep your order history in one place',
];

export default function LoginPage() {
  const { user, status, isAvailable, signIn, signOut, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // `RequireAuth` sends the user here with the page they wanted in `state.from`.
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    if (status === 'ready' && user) navigate(from, { replace: true });
  }, [status, user, from, navigate]);

  if (user) return <Navigate to={from} replace />;

  const handleSignIn = async () => {
    setFailure(null);
    setBusy(true);
    try {
      await signIn();
      // A redirect sign-in leaves the page; a popup resolves here.
      setBusy(false);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-8 py-12 md:grid-cols-2 md:items-center">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
          Sign in to order food
        </h1>
        <p className="mt-3 text-neutral-600">
          Use your Google account to check out. We only read your name, email and profile photo.
        </p>

        <ul className="mt-6 space-y-3">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-sm text-neutral-700">
              <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                ✓
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={busy || !isAvailable}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <SpinnerIcon className="size-5" />
          ) : (
            <GoogleMark />
          )}
          {busy ? 'Signing you in…' : 'Continue with Google'}
        </button>

        {!isAvailable && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Firebase is not configured, so sign-in is unavailable. Add your keys to <code className="font-mono">.env</code>.
          </p>
        )}

        {(failure ?? error) && (
          <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {failure ?? error}
          </p>
        )}

        <p className="mt-5 text-xs text-neutral-400">
          This is a demo. Google sign-in opens a real Google popup — no credentials are sent to this app.
        </p>

        <div className="mt-5 border-t border-neutral-100 pt-4 text-center">
          <Link to="/" className="text-sm font-semibold text-brand-600 hover:underline">
            Continue browsing without logging in
          </Link>
        </div>

        {user && (
          <button type="button" onClick={() => void signOut()} className="mt-2 w-full text-xs text-neutral-500">
            Log out
          </button>
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
      />
    </svg>
  );
}
