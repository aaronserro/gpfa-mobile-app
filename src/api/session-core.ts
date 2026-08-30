export interface RefreshableSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

export function parseStoredSession(value: string): RefreshableSession | null {
  try {
    const candidate = JSON.parse(value) as Record<string, unknown>;
    const expiresAt = candidate.expiresAt;
    if (
      typeof candidate.accessToken !== 'string' ||
      !candidate.accessToken ||
      typeof candidate.refreshToken !== 'string' ||
      !candidate.refreshToken ||
      !(expiresAt === null || (typeof expiresAt === 'number' && Number.isFinite(expiresAt)))
    ) {
      return null;
    }
    return {
      accessToken: candidate.accessToken,
      refreshToken: candidate.refreshToken,
      expiresAt,
    };
  } catch {
    return null;
  }
}

interface SupabaseSessionResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_at?: unknown;
  expires_in?: unknown;
}

export function isSessionNearExpiry(
  session: RefreshableSession,
  nowSeconds: number,
  skewSeconds: number
): boolean {
  return session.expiresAt === null || session.expiresAt <= nowSeconds + skewSeconds;
}

export function isTerminalRefreshStatus(status: number): boolean {
  return status === 400 || status === 401 || status === 403;
}

export function parseRefreshPayload(
  payload: SupabaseSessionResponse | null,
  nowSeconds: number
): RefreshableSession | null {
  const accessToken = payload?.access_token;
  const refreshToken = payload?.refresh_token;
  const expiresAt = payload?.expires_at;
  const expiresIn = payload?.expires_in;
  if (typeof accessToken !== 'string' || !accessToken || typeof refreshToken !== 'string' || !refreshToken) {
    return null;
  }

  const resolvedExpiry =
    typeof expiresAt === 'number' && Number.isFinite(expiresAt)
      ? expiresAt
      : typeof expiresIn === 'number' && Number.isFinite(expiresIn)
        ? Math.floor(nowSeconds) + expiresIn
        : null;
  if (resolvedExpiry === null) return null;
  return { accessToken, refreshToken, expiresAt: resolvedExpiry };
}

export function createSingleFlight<T>(): (operation: () => Promise<T>) => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return (operation) => {
    if (inFlight) return inFlight;
    inFlight = operation().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}