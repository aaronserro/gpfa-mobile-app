import type { MessageItem } from '../api/types';

export function memberRealtimeRetryDelayMs(attempt: number) {
  return Math.min(1_000 * 2 ** Math.max(0, attempt), 15_000);
}

/** Returns true for a duplicate and retains only the newest identifiers. */
export function rememberBoundedId(ids: string[], id: string, limit = 500): boolean {
  if (ids.includes(id)) return true;
  ids.push(id);
  if (ids.length > limit) ids.splice(0, ids.length - limit);
  return false;
}

/** Canonical message windows may overlap; id wins and ordinal owns display order. */
export function mergeRealtimeMessages(
  current: MessageItem[],
  incoming: MessageItem[]
): MessageItem[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((left, right) => left.ordinal - right.ordinal);
}
