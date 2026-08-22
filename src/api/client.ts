import { AI_REQUEST_TIMEOUT_MS, API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
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
  /** Optional host override for routes served from a different origin. */
  baseUrl?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface StreamRequestOptions extends Omit<RequestOptions, 'method'> {
  method?: 'POST';
}

/**
 * Single entry point for backend calls: attaches the bearer token, enforces a
 * timeout, and normalises every failure into an ApiError.
 *
 * Native requests aren't subject to CORS, so no preflight concerns here — but
 * iOS App Transport Security will reject plain http:// in release builds.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous = false, baseUrl, signal, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const resolvedBaseUrl = baseUrl ?? API_BASE_URL;
  const formData = isFormData(body);

  if (!resolvedBaseUrl) {
    throw new ApiError('No API base URL configured (EXPO_PUBLIC_API_URL).', 0);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';
  if (resolvedBaseUrl.includes('ngrok-free.')) headers['ngrok-skip-browser-warning'] = 'true';
  if (!anonymous) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Time out slow requests without losing an externally supplied abort signal.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);

  let response: Response;
  const target = `${resolvedBaseUrl}${path}`;
  try {
    if (__DEV__) console.info(`[api] ${method} ${target}`);
    response = await fetch(target, {
      method,
      headers,
      body: body === undefined ? undefined : formData ? body : JSON.stringify(body),
      signal: controller.signal,
    });
    if (__DEV__) console.info(`[api] ${response.status} ${method} ${target}`);
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    if (__DEV__) console.warn(`[api] ${aborted ? 'timeout' : 'network'} ${method} ${target}`);
    throw new ApiError(
      aborted ? `The request timed out (${target}).` : `Could not reach the server (${target}).`,
      0,
      cause
    );
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

export async function requestStream(path: string, options: StreamRequestOptions = {}): Promise<Response> {
  const { method = 'POST', body, anonymous = false, baseUrl, signal, timeoutMs = AI_REQUEST_TIMEOUT_MS } = options;
  const resolvedBaseUrl = baseUrl ?? API_BASE_URL;

  if (!resolvedBaseUrl) {
    throw new ApiError('No API base URL configured (EXPO_PUBLIC_API_URL).', 0);
  }

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
  };
  if (resolvedBaseUrl.includes('ngrok-free.')) headers['ngrok-skip-browser-warning'] = 'true';
  if (!anonymous) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);

  const target = `${resolvedBaseUrl}${path}`;
  try {
    if (__DEV__) console.info(`[api] ${method} ${target}`);
    const response = await fetch(target, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (__DEV__) console.info(`[api] ${response.status} ${method} ${target}`);

    if (!response.ok) {
      const text = await response.text();
      const payload = text ? safeJson(text) : null;
      if (response.status === 401 || response.status === 403) onUnauthorized?.();
      throw new ApiError(messageFrom(payload) ?? `Request failed (${response.status}).`, response.status, payload);
    }

    return response;
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    if (__DEV__) console.warn(`[api] ${aborted ? 'timeout' : 'network'} ${method} ${target}`);
    throw new ApiError(
      aborted ? `The request timed out (${target}).` : `Could not reach the server (${target}).`,
      0,
      cause
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
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
