import {
  REQUEST_TIMEOUT_MS,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from './config';
import {
  createSingleFlight,
  isSessionNearExpiry,
  isTerminalRefreshStatus,
  parseRefreshPayload,
} from './session-core';
import { clearTokens, getStoredSession, saveSession, type StoredAuthSession } from './tokens';

const REFRESH_SKEW_SECONDS = 60;

export class SessionError extends Error {
  constructor(
    message: string,
    readonly terminal: boolean,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

const runRefreshSingleFlight = createSingleFlight<StoredAuthSession>();
let sessionGeneration = 0;

/** Cancel pending refresh persistence before removing local credentials. */
export async function invalidateStoredSession(): Promise<void> {
  sessionGeneration += 1;
  await clearTokens();
}

function requireSupabaseAuthConfig(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new SessionError(
      'Supabase Auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
      false
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY };
}

function needsRefresh(session: StoredAuthSession): boolean {
  return isSessionNearExpiry(session, Date.now() / 1000, REFRESH_SKEW_SECONDS);
}

export async function getSessionForRequest(): Promise<StoredAuthSession | null> {
  const session = await getStoredSession();
  if (!session || !needsRefresh(session)) return session;
  return refreshSession();
}

/** Refresh only if the rejected token is still current, avoiding duplicate rotation. */
export async function refreshAfterUnauthorized(
  rejectedAccessToken: string | null
): Promise<StoredAuthSession> {
  const current = await getStoredSession();
  if (!current) throw new SessionError('The session is no longer available.', true);
  if (rejectedAccessToken && current.accessToken !== rejectedAccessToken) return current;
  return refreshSession();
}

export function refreshSession(): Promise<StoredAuthSession> {
  return runRefreshSingleFlight(performRefresh);
}

async function performRefresh(): Promise<StoredAuthSession> {
  const generation = sessionGeneration;
  const current = await getStoredSession();
  if (!current) throw new SessionError('The session is no longer available.', true);
  const { url, key } = requireSupabaseAuthConfig();

  let response: Response;
  try {
    response = await fetchWithTimeout(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: key,
      },
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    });
  } catch (cause) {
    throw new SessionError('Could not refresh the session. Check your connection and try again.', false, cause);
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const terminal = isTerminalRefreshStatus(response.status);
    throw new SessionError(
      terminal ? 'The session has expired. Please sign in again.' : 'Could not refresh the session. Please try again.',
      terminal,
      payload
    );
  }

  const session = parseRefreshResponse(payload);
  if (generation !== sessionGeneration) {
    throw new SessionError('The session is no longer available.', true);
  }
  await saveSession(session);
  return session;
}

export async function revokeCurrentSession(accessToken: string): Promise<void> {
  const { url, key } = requireSupabaseAuthConfig();
  let response: Response;
  try {
    response = await fetchWithTimeout(`${url}/auth/v1/logout?scope=local`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        apikey: key,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (cause) {
    throw new SessionError('Could not confirm remote session revocation.', false, cause);
  }
  if (!response.ok) {
    throw new SessionError('Could not confirm remote session revocation.', false, await readJson(response));
  }
}

function parseRefreshResponse(payload: unknown): StoredAuthSession {
  const session = parseRefreshPayload(
    payload && typeof payload === 'object' ? payload : null,
    Date.now() / 1000
  );
  if (!session) throw new SessionError('Supabase Auth returned an invalid session.', true, payload);
  return session;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}