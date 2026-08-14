/**
 * Where the app gets its data.
 *
 * Set EXPO_PUBLIC_API_URL to point at a backend; leave it unset and the app
 * runs on the local fixtures. Expo inlines EXPO_PUBLIC_* variables at build
 * time, so this is a build-time switch — restart the dev server after changing
 * it. See .env.example.
 *
 * Note the value must be reachable *from the phone*: `localhost` resolves to
 * the device itself, so use the machine's LAN address or a tunnel in dev.
 */
const raw = process.env.EXPO_PUBLIC_API_URL ?? '';

/** Base URL with any trailing slash removed, or '' when unset. */
export const API_BASE_URL = raw.trim().replace(/\/+$/, '');

/** True once a backend is configured; false means fixtures. */
export const USING_REMOTE_API = API_BASE_URL.length > 0;

/** Abort a request that hasn't responded in this long. */
export const REQUEST_TIMEOUT_MS = 15000;

/**
 * Paths are collected here so a backend whose routes differ can be adapted in
 * one place rather than across the call sites.
 */
export const ROUTES = {
  login: '/auth/login',
  logout: '/auth/logout',
  session: '/auth/session',
  groups: '/groups',
  feed: '/posts',
  news: '/news',
  ask: '/ask',
  post: (id: string) => `/posts/${id}`,
  replies: (id: string) => `/posts/${id}/replies`,
  upvote: (id: string) => `/posts/${id}/upvote`,
  vote: (id: string) => `/posts/${id}/vote`,
  rsvp: (id: string) => `/posts/${id}/rsvp`,
} as const;
