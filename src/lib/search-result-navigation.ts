import { parseMemberHref, SAFE_MEMBER_PATH_SEGMENT } from './notification-navigation';

export type SearchResultDestination =
  | { kind: 'member-profile'; organizationSlug: string; mentionHandle: string }
  | { kind: 'organization'; slug: string }
  | { kind: 'group'; slug: string }
  | { kind: 'group-item'; slug: string; id: string; itemType: 'discussion' | 'poll' }
  | { kind: 'event'; id: string }
  | { kind: 'resource'; slug: string }
  | { kind: 'podcast'; slug: string }
  | { kind: 'job'; id: string }
  | { kind: 'annual-meeting' }
  | { kind: 'announcement'; id: string }
  | { kind: 'survey'; id: string }
  | { kind: 'web'; url: string };

function onlyQueryParameter(url: URL, name: string): string | null {
  const entries = [...url.searchParams.entries()];
  if (entries.length !== 1 || entries[0]?.[0] !== name) return null;
  const value = entries[0][1];
  return SAFE_MEMBER_PATH_SEGMENT.test(value) ? value : null;
}

function hasNoQuery(url: URL): boolean {
  return url.search === '';
}

/** Builds a browser fallback only from a strict route and a production HTTPS origin. */
export function trustedMemberWebUrl(href: string, webOrigin: string): string | null {
  const route = parseMemberHref(href);
  if (!route) return null;

  try {
    const origin = new URL(webOrigin.trim());
    if (
      origin.protocol !== 'https:' ||
      origin.username ||
      origin.password ||
      (origin.pathname !== '/' && origin.pathname !== '') ||
      origin.search ||
      origin.hash
    ) return null;

    const destination = new URL(`${route.pathname}${route.search}`, `${origin.origin}/`);
    return destination.origin === origin.origin ? destination.toString() : null;
  } catch {
    return null;
  }
}

/** Resolves every indexed member-search href to a native route or a trusted web fallback. */
export function searchResultDestination(
  href: string,
  webOrigin: string
): SearchResultDestination | null {
  const url = parseMemberHref(href);
  if (!url) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  const noQuery = hasNoQuery(url);

  if (noQuery && parts.length === 4 && parts[0] === 'members' && parts[1] === 'directory') {
    return { kind: 'member-profile', organizationSlug: parts[2], mentionHandle: parts[3] };
  }
  if (noQuery && parts.length === 3 && parts[0] === 'members' && parts[1] === 'directory') {
    return { kind: 'organization', slug: parts[2] };
  }
  if (noQuery && parts.length === 3 && parts[0] === 'members' && parts[1] === 'groups') {
    return { kind: 'group', slug: parts[2] };
  }
  if (noQuery && parts[0] === 'members' && parts[1] === 'groups' && parts[2]) {
    if (parts.length === 5 && parts[3] === 'polls') {
      return { kind: 'group-item', slug: parts[2], id: parts[4], itemType: 'poll' };
    }
    if (parts.length === 4) {
      return { kind: 'group-item', slug: parts[2], id: parts[3], itemType: 'discussion' };
    }
  }
  if (url.pathname === '/members/events') {
    const id = onlyQueryParameter(url, 'event');
    if (id) return { kind: 'event', id };
  }
  if (noQuery && parts.length === 3 && parts[0] === 'members' && parts[1] === 'library') {
    return { kind: 'resource', slug: parts[2] };
  }
  if (noQuery && parts.length === 3 && parts[0] === 'members' && parts[1] === 'podcasts') {
    return { kind: 'podcast', slug: parts[2] };
  }
  if (url.pathname === '/members/job-board') {
    const id = onlyQueryParameter(url, 'job');
    if (id) return { kind: 'job', id };
  }
  if (noQuery && url.pathname === '/members/annual-meeting') {
    return { kind: 'annual-meeting' };
  }
  if (noQuery && parts.length === 3 && parts[0] === 'members' && parts[1] === 'announcements') {
    return { kind: 'announcement', id: parts[2] };
  }
  if (noQuery && parts.length === 3 && parts[0] === 'members' && parts[1] === 'surveys') {
    return { kind: 'survey', id: parts[2] };
  }

  const fallback = trustedMemberWebUrl(href, webOrigin);
  return fallback ? { kind: 'web', url: fallback } : null;
}