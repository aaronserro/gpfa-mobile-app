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

  const time = firstString(record.time, createdAt, record.date);
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

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function nullableString(...values: unknown[]): string | null | undefined {
  const value = values.find((candidate) => candidate === null || typeof candidate === 'string');
  return typeof value === 'string' ? value.trim() : value;
}
