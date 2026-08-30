import type { MemberNotification } from '../api/types';

export type NotificationDestination =
  | { kind: 'annual-meeting' }
  | { kind: 'announcement'; id: string }
  | { kind: 'survey'; id: string }
  | { kind: 'event'; ids: string[] }
  | { kind: 'group'; slug: string }
  | { kind: 'group-item'; slug: string; id: string; itemType: 'discussion' | 'poll' }
  | { kind: 'deleted'; label: string }
  | { kind: 'unsupported' };

const ANNUAL_MEETING_KINDS = new Set([
  'annual_meeting_registration_received',
  'annual_meeting_registration_confirmed',
  'annual_meeting_registration_updated',
  'annual_meeting_registration_status_changed',
]);

const CONTENT_LABELS: Record<string, string> = {
  announcement: 'announcement',
  survey: 'survey',
  event: 'event',
  working_group_post: 'working group post',
  working_group_poll: 'working group poll',
};

const SAFE_SEGMENT = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/i;

function parseMemberHref(href: string | undefined): URL | null {
  if (
    !href ||
    !href.startsWith('/') ||
    href.startsWith('//') ||
    href.includes('\\') ||
    href.includes('..') ||
    /%(?:2e|2f|5c)/i.test(href)
  ) return null;

  try {
    const url = new URL(href, 'https://gpfa.invalid');
    if (url.origin !== 'https://gpfa.invalid' || url.hash) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.some((part) => !SAFE_SEGMENT.test(part))) return null;
    return url;
  } catch {
    return null;
  }
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function notificationDestination(
  notification: MemberNotification
): NotificationDestination {
  const contentType = notification.contentType;
  if (notification.contentDeletedAt) {
    return { kind: 'deleted', label: CONTENT_LABELS[contentType ?? ''] ?? 'content' };
  }

  const url = parseMemberHref(notification.href);
  const parts = url?.pathname.split('/').filter(Boolean) ?? [];
  const isMemberPath = parts[0] === 'members';

  if (ANNUAL_MEETING_KINDS.has(notification.kind ?? '') || url?.pathname === '/members/annual-meeting') {
    return { kind: 'annual-meeting' };
  }

  if (contentType === 'announcement' && notification.contentId) {
    return { kind: 'announcement', id: notification.contentId };
  }
  if (contentType === 'survey' && notification.contentId) {
    return { kind: 'survey', id: notification.contentId };
  }
  if (contentType === 'event' && notification.contentId) {
    return {
      kind: 'event',
      ids: unique([notification.contentId, url?.searchParams.get('event')]),
    };
  }

  if (isMemberPath && parts[1] === 'groups' && parts[2]) {
    if (parts.length === 3) return { kind: 'group', slug: parts[2] };
    if (parts[3] === 'polls' && parts.length === 5) {
      return { kind: 'group-item', slug: parts[2], id: parts[4], itemType: 'poll' };
    }
    if (parts.length === 4) {
      return { kind: 'group-item', slug: parts[2], id: parts[3], itemType: 'discussion' };
    }
  }

  if (isMemberPath && parts[1] === 'announcements' && parts.length === 3) {
    return { kind: 'announcement', id: notification.contentId ?? parts[2] };
  }
  if (isMemberPath && parts[1] === 'surveys' && parts.length === 3) {
    return { kind: 'survey', id: notification.contentId ?? parts[2] };
  }
  if (url?.pathname === '/members/events') {
    const event = url.searchParams.get('event');
    if (event && SAFE_SEGMENT.test(event)) return { kind: 'event', ids: [event] };
  }

  return { kind: 'unsupported' };
}
