import { AI_REQUEST_TIMEOUT_MS, API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { getSessionForRequest, refreshAfterUnauthorized, SessionError } from './session';

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

/** A request deliberately cancelled by its caller rather than by a timeout. */
export class RequestCancelledError extends Error {
  constructor() {
    super('The request was cancelled.');
    this.name = 'RequestCancelledError';
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

export interface EventStreamRequestOptions extends StreamRequestOptions {
  onChunk: (chunk: Uint8Array) => void | Promise<void>;
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

  const target = `${resolvedBaseUrl}${path}`;
  let token = anonymous ? null : await accessTokenForRequest();
  let response = await executeRequest(target, method, body, formData, token, signal, timeoutMs);

  if (!anonymous && response.status === 401) {
    await response.text();
    token = await refreshForRetry(token);
    response = await executeRequest(target, method, body, formData, token, signal, timeoutMs);
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

  const target = `${resolvedBaseUrl}${path}`;
  let token = anonymous ? null : await accessTokenForRequest();
  let response = await executeRequest(target, method, body, false, token, signal, timeoutMs, true);
  if (!anonymous && response.status === 401) {
    await response.text();
    token = await refreshForRetry(token);
    response = await executeRequest(target, method, body, false, token, signal, timeoutMs, true);
  }

  if (!response.ok) {
    const text = await response.text();
    const payload = text ? safeJson(text) : null;
    if (response.status === 401 || response.status === 403) onUnauthorized?.();
    throw new ApiError(messageFrom(payload) ?? `Request failed (${response.status}).`, response.status, payload);
  }
  return response;
}

/**
 * Consume a streaming response while this function still owns its timeout and
 * abort listeners. A stream may retry authentication only before any body byte
 * has been observed, because replaying it later could duplicate a saved write.
 */
export async function requestEventStream(
  path: string,
  options: EventStreamRequestOptions
): Promise<void> {
  const {
    method = 'POST',
    body,
    anonymous = false,
    baseUrl,
    signal,
    timeoutMs = AI_REQUEST_TIMEOUT_MS,
    onChunk,
  } = options;
  const resolvedBaseUrl = baseUrl ?? API_BASE_URL;
  if (!resolvedBaseUrl) {
    throw new ApiError('No API base URL configured (EXPO_PUBLIC_API_URL).', 0);
  }
  if (signal?.aborted) throw new RequestCancelledError();

  const target = `${resolvedBaseUrl}${path}`;
  let token = anonymous ? null : await accessTokenForRequest();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const abortFromCaller = () => controller.abort();
    signal?.addEventListener('abort', abortFromCaller, { once: true });

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let finished = false;
    try {
      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      };
      if (target.includes('ngrok-free.')) headers['ngrok-skip-browser-warning'] = 'true';
      if (token) headers.Authorization = `Bearer ${token}`;

      if (__DEV__) console.info(`[api] ${method} ${target}`);
      const response = await fetch(target, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (__DEV__) console.info(`[api] ${response.status} ${method} ${target}`);

      if (!anonymous && response.status === 401 && attempt === 0) {
        await response.text();
        token = await refreshForRetry(token);
        continue;
      }
      if (!response.ok) {
        const text = await response.text();
        const payload = text ? safeJson(text) : null;
        if (response.status === 401 || response.status === 403) onUnauthorized?.();
        throw new ApiError(
          messageFrom(payload) ?? `Request failed (${response.status}).`,
          response.status,
          payload
        );
      }

      reader = response.body?.getReader?.() ?? null;
      if (!reader) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length) {
          await onChunk(bytes);
        }
        finished = true;
        return;
      }

      while (true) {
        const result = await reader.read();
        if (result.done) {
          finished = true;
          return;
        }
        if (!result.value?.length) continue;
        await onChunk(result.value);
      }
    } catch (cause) {
      if (signal?.aborted) throw new RequestCancelledError();
      if (timedOut) {
        throw new ApiError(`The request timed out (${target}).`, 0, cause);
      }
      if (cause instanceof ApiError) throw cause;
      if (__DEV__) console.warn(`[api] network ${method} ${target}`);
      throw new ApiError(`Could not reach the server (${target}).`, 0, cause);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abortFromCaller);
      if (reader && !finished) {
        try {
          await reader.cancel();
        } catch {
          // The transport may already have torn the reader down after abort.
        }
      }
    }
  }
}

async function accessTokenForRequest(): Promise<string | null> {
  try {
    return (await getSessionForRequest())?.accessToken ?? null;
  } catch (cause) {
    const error = sessionApiError(cause);
    if (error.status === 401) onUnauthorized?.();
    throw error;
  }
}

async function refreshForRetry(rejectedToken: string | null): Promise<string> {
  try {
    return (await refreshAfterUnauthorized(rejectedToken)).accessToken;
  } catch (cause) {
    const error = sessionApiError(cause);
    if (error.status === 401) onUnauthorized?.();
    throw error;
  }
}

function sessionApiError(cause: unknown): ApiError {
  if (cause instanceof SessionError) {
    return new ApiError(cause.message, cause.terminal ? 401 : 0, cause.cause);
  }
  return new ApiError('Could not refresh the session.', 0, cause);
}

async function executeRequest(
  target: string,
  method: NonNullable<RequestOptions['method']>,
  body: unknown,
  formData: boolean,
  token: string | null,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  stream = false
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: stream ? 'text/event-stream' : 'application/json',
  };
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';
  if (target.includes('ngrok-free.')) headers['ngrok-skip-browser-warning'] = 'true';
  if (token) headers.Authorization = `Bearer ${token}`;

  // Time out slow requests without losing an externally supplied abort signal.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  try {
    if (__DEV__) console.info(`[api] ${method} ${target}`);
    const response = await fetch(target, {
      method,
      headers,
      body: body === undefined ? undefined : formData ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
    if (__DEV__) console.info(`[api] ${response.status} ${method} ${target}`);
    return response;
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
