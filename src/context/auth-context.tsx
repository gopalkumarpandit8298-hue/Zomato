import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isAdminEmail, isFirebaseConfigured } from '../lib/firebase-app';
import type { AuthUser } from '../types/food';

type AuthStatus = 'loading' | 'ready';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAvailable: boolean;
  /** True when the signed-in email is on the admin allow-list. */
  isAdmin: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setStatus('ready');
      return;
    }

    let active = true;

    // `firebase/auth` is dynamically imported so the SDK stays out of the
    // initial bundle and sign-in costs nothing for anonymous visitors.
    import('../lib/auth-repository')
      .then(({ subscribeToAuth }) => {
        if (!active) return;
        return subscribeToAuth(
          (nextUser) => {
            if (!active) return;
            setUser(nextUser);
            setStatus('ready');
          },
          (authError) => {
            if (!active) return;
            setError(authError.message);
            setStatus('ready');
          },
        );
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('ready');
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    const { signInWithGoogle } = await import('../lib/auth-repository');
    await signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    const { signOutUser } = await import('../lib/auth-repository');
    await signOutUser();
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setError(null);
    const { signInWithPassword: signIn } = await import('../lib/auth-repository');
    await signIn(email, password);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAvailable: isFirebaseConfigured,
      isAdmin: isAdminEmail(user?.email),
      error,
      signIn,
      signInWithPassword,
      signOut,
    }),
    [user, status, error, signIn, signInWithPassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
