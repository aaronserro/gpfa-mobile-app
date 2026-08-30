import type { AskSource } from '../api/types';

export type AskSourceDestination =
  | { kind: 'event'; id: string }
  | { kind: 'group'; slug: string }
  | { kind: 'podcast'; slug: string }
  | { kind: 'web'; path: string };

const SAFE_SEGMENT = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/i;

function safeSegment(value: string | null) {
  return value && SAFE_SEGMENT.test(value) ? value : null;
}

/** Converts only validated member routes into native destinations; everything else stays on the trusted web origin. */
export function askSourceDestination(source: AskSource): AskSourceDestination | null {
  if (
    !source.href.startsWith('/') ||
    source.href.startsWith('//') ||
    source.href.includes('\\') ||
    source.href.includes('..') ||
    /%(?:2e|2f|5c)/i.test(source.href)
  ) return null;

  let url: URL;
  try {
    url = new URL(source.href, 'https://gpfa.invalid');
  } catch {
    return null;
  }
  if (url.origin !== 'https://gpfa.invalid' || url.hash) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.some((part) => !safeSegment(part))) return null;

  if (url.pathname === '/members/events') {
    const id = safeSegment(url.searchParams.get('event'));
    if (id) return { kind: 'event', id };
  }

  if (parts.length === 3 && parts[0] === 'members' && parts[1] === 'groups') {
    return { kind: 'group', slug: parts[2] };
  }

  if (parts.length === 3 && parts[0] === 'members' && parts[1] === 'podcasts') {
    return { kind: 'podcast', slug: parts[2] };
  }

  return { kind: 'web', path: `${url.pathname}${url.search}` };
}

export function trustedAskSourceUrl(path: string, webOrigin: string) {
  if (
    !webOrigin ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    /[\\#]/.test(path) ||
    path.includes('..') ||
    /%(?:2e|2f|5c)/i.test(path)
  ) return null;
  try {
    const origin = new URL(webOrigin);
    const destination = new URL(path, `${origin.origin}/`);
    return destination.origin === origin.origin ? destination.toString() : null;
  } catch {
    return null;
  }
}
