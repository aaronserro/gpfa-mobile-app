import type { MemberNotification } from '../api/types';

export const NOTIFICATION_LIST_LIMIT = 30;

export function markNotificationItemsRead(
  notifications: MemberNotification[],
  ids: readonly string[]
): MemberNotification[] {
  const selected = new Set(ids);
  return notifications.map((notification) =>
    selected.has(notification.id) && !notification.read
      ? { ...notification, read: true }
      : notification
  );
}

export function dismissNotificationItems(
  notifications: MemberNotification[],
  ids: readonly string[]
): MemberNotification[] {
  const selected = new Set(ids);
  return notifications.filter((notification) => !selected.has(notification.id));
}

export function prependNotificationItem(
  notifications: MemberNotification[],
  notification: MemberNotification
): MemberNotification[] {
  if (notifications.some(({ id }) => id === notification.id)) return notifications;
  return [notification, ...notifications].slice(0, NOTIFICATION_LIST_LIMIT);
}

export function notificationIsBeforeMemberJoin(
  notification: MemberNotification,
  memberCreatedAt: string | null
): boolean {
  if (!memberCreatedAt || !notification.createdAt) return false;
  const created = Date.parse(notification.createdAt);
  const joined = Date.parse(memberCreatedAt);
  return !Number.isNaN(created) && !Number.isNaN(joined) && created < joined;
}
