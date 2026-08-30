import type { AskMessage } from '../api/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAskConversationId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function mergeAskMessages(current: AskMessage[], incoming: AskMessage[]): AskMessage[] {
  const byId = new Map<string, AskMessage>();
  for (const message of [...incoming, ...current]) byId.set(message.id, message);
  return [...byId.values()].sort((left, right) => {
    const timeDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return timeDifference || left.id.localeCompare(right.id);
  });
}
