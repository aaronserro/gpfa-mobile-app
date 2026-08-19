import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, request, setUnauthorizedHandler } from '../api/client';
import { AUTH_BASE_URL, GPFA_WEB_ORIGIN, ROUTES, USING_REMOTE_API } from '../api/config';
import { clearTokens, getAccessToken, saveTokens } from '../api/tokens';

interface LoginResponse {
  /** Common aliases so a backend can use any of them without a code change. */
  accessToken?: string;
  access_token?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  auth?: {
    accessToken?: string;
    access_token?: string;
    token?: string;
    refreshToken?: string;
    refresh_token?: string;
  };
}

type Status = 'restoring' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  /** True once a token is held (or, without a backend, after any sign-in). */
  isSignedIn: boolean;
  /** Set while a sign-in request is in flight. */
  busy: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  status: 'signedOut',
  isSignedIn: false,
  busy: false,
  error: null,
  signIn: async () => false,
  signOut: () => {},
});

/**
 * Session state for the app.
 *
 * With no backend configured, sign-in is accepted locally so the UI stays
 * usable on fixtures. Once EXPO_PUBLIC_API_URL is set it posts real
 * credentials, stores the token in the Keychain/Keystore, and restores the
 * session on launch.
 *
 * Note this expects a token-issuing endpoint. If the web app authenticates
 * with httpOnly session cookies, that won't carry over — native has no
 * per-origin cookie jar, so the backend needs a token route for mobile.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(USING_REMOTE_API ? 'restoring' : 'signedOut');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore a stored session before showing the sign-in screen.
  useEffect(() => {
    if (!USING_REMOTE_API) return;
    let alive = true;
    void (async () => {
      const token = await getAccessToken();
      if (alive) setStatus(token ? 'signedIn' : 'signedOut');
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signOut = useCallback(() => {
    void clearTokens();
    setError(null);
    setStatus('signedOut');
  }, []);

  // A 401 from anywhere in the app drops the session.
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);

    if (!USING_REMOTE_API) {
      setStatus('signedIn');
      return true;
    }

    setBusy(true);
    try {
      const res = await request<LoginResponse>(ROUTES.login, {
        method: 'POST',
        baseUrl: AUTH_BASE_URL,
        body: {
          email,
          password,
          ...(GPFA_WEB_ORIGIN ? { webOrigin: GPFA_WEB_ORIGIN } : {}),
        },
        anonymous: true,
      });
      const access =
        res.accessToken ??
        res.access_token ??
        res.token ??
        res.auth?.accessToken ??
        res.auth?.access_token ??
        res.auth?.token;
      if (!access) throw new ApiError('Sign-in succeeded but returned no token.', 500, res);
      await saveTokens(
        access,
        res.refreshToken ?? res.refresh_token ?? res.auth?.refreshToken ?? res.auth?.refresh_token
      );
      setStatus('signedIn');
      return true;
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.isUnauthorized
            ? 'That email and password were not accepted.'
            : cause.message
          : 'Could not sign in.';
      setError(message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, isSignedIn: status === 'signedIn', busy, error, signIn, signOut }),
    [status, busy, error, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => useContext(AuthContext);
