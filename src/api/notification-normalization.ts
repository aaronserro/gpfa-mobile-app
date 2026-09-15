import type { MemberNotification, MemberNotificationsResponse } from './types';

export function normalizeNotifications(payload: unknown): MemberNotificationsResponse {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).notifications)
      ? ((payload as Record<string, unknown>).notifications as unknown[])
      : [];
  const memberCreatedAt =
    payload && typeof payload === 'object'
      ? nullableString((payload as Record<string, unknown>).memberCreatedAt)
      : undefined;

  return {
    memberCreatedAt: memberCreatedAt ?? null,
    notifications: rows
      .map((row, index) => normalizeNotification(row, index, 'api'))
      .filter((notification): notification is MemberNotification => notification !== null),
  };
}

export function normalizeNotification(
  row: unknown,
  index = 0,
  source: 'api' | 'fixture' | 'realtime' = 'api'
): MemberNotification | null {
  if (typeof row === 'string' && source === 'fixture') {
    return { id: `notification-${index}`, title: row, read: false };
  }
  if (!row || typeof row !== 'object') return null;

  const record = row as Record<string, unknown>;
  const id = firstString(record.id, record._id, record.uuid);
  const kind = firstString(record.kind, record.type);
  const title = firstString(record.title, record.subject, record.message, record.text);
  const body = firstString(record.body, record.description, record.detail);
  const createdAt = firstString(record.created_at, record.createdAt);
  const targetType = firstString(record.target_type, record.targetType);
  const missingFields = [
    !id && 'id',
    !kind && 'kind',
    !title && 'title',
    !body && 'body',
    !createdAt && 'createdAt',
    !targetType && 'targetType',
  ].filter((field): field is string => Boolean(field));

  if (source !== 'fixture' && missingFields.length) {
    // Never include title/body in diagnostics: notification copy can be private member content.
    console.warn('[notifications] Malformed notification payload.', {
      source,
      id: id ?? null,
      kind: kind ?? null,
      missingFields,
    });
    return null;
  }
  if (!title) return null;

  const time = notificationTimeLabel(firstString(record.time, createdAt, record.date));
  const href = firstString(record.navigation_href, record.href, record.url, record.link);
  const targetId = firstString(record.target_id, record.targetId);
  const contentType = firstString(record.content_type, record.contentType);
  const contentId = firstString(record.content_id, record.contentId);
  const contentDeletedAt = nullableString(record.content_deleted_at, record.contentDeletedAt);
  const read =
    typeof record.read === 'boolean'
      ? record.read
      : typeof record.isRead === 'boolean'
        ? record.isRead
        : typeof record.readAt === 'string';

  return {
    id: id ?? `notification-${index}`,
    ...(kind ? { kind } : {}),
    title,
    ...(body ? { body } : {}),
    ...(time ? { time } : {}),
    ...(createdAt ? { createdAt } : {}),
    read,
    ...(href ? { href } : {}),
    ...(targetType ? { targetType } : {}),
    ...(targetId ? { targetId } : {}),
    ...(contentType ? { contentType } : {}),
    ...(contentId ? { contentId } : {}),
    ...(contentDeletedAt !== undefined ? { contentDeletedAt } : {}),
  };
}

/** Keeps server-authored labels, but turns canonical timestamps into compact mobile copy. */
export function notificationTimeLabel(value: string | undefined, now = Date.now()): string | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;

  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(timestamp);
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function nullableString(...values: unknown[]): string | null | undefined {
  const value = values.find((candidate) => candidate === null || typeof candidate === 'string');
  return typeof value === 'string' ? value.trim() : value;
}
