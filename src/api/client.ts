import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { getAccessToken } from './tokens';

/** A failed request, carrying enough for the UI to decide what to show. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The session is gone or was never valid — the app should sign out. */
  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** No response at all: airplane mode, wrong LAN address, server down. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/** Invoked when a request comes back 401/403, so the app can drop the session. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip the Authorization header — used by the login call itself. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

/**
 * Single entry point for backend calls: attaches the bearer token, enforces a
 * timeout, and normalises every failure into an ApiError.
 *
 * Native requests aren't subject to CORS, so no preflight concerns here — but
 * iOS App Transport Security will reject plain http:// in release builds.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('No API base URL configured (EXPO_PUBLIC_API_URL).', 0);
  }

  const { method = 'GET', body, anonymous = false, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!anonymous) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Time out slow requests without losing an externally supplied abort signal.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    throw new ApiError(aborted ? 'The request timed out.' : 'Could not reach the server.', 0, cause);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) onUnauthorized?.();
    throw new ApiError(messageFrom(payload) ?? `Request failed (${response.status}).`, response.status, payload);
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Pull an error message out of the common `{ message }` / `{ error }` shapes. */
function messageFrom(payload: unknown): string | null {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail']) {
      if (typeof record[key] === 'string') return record[key] as string;
    }
  }
  return null;
}
