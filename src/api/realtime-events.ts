import type { MessagingRealtimeEvent, WorkingGroupFeedRealtimeEvent } from './types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATETIME_WITH_OFFSET_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const WORKING_GROUP_ITEM_TYPES = new Set(['discussion', 'announcement', 'event', 'poll']);
const WORKING_GROUP_CHANGE_TYPES = new Set(['created', 'updated', 'deleted']);

export function parseWorkingGroupFeedRealtimeEvent(
  value: unknown
): WorkingGroupFeedRealtimeEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.eventId !== 'string' ||
    !UUID_PATTERN.test(record.eventId) ||
    typeof record.groupSlug !== 'string' ||
    !record.groupSlug.trim() ||
    typeof record.itemType !== 'string' ||
    !WORKING_GROUP_ITEM_TYPES.has(record.itemType) ||
    typeof record.itemId !== 'string' ||
    !UUID_PATTERN.test(record.itemId) ||
    typeof record.changeType !== 'string' ||
    !WORKING_GROUP_CHANGE_TYPES.has(record.changeType) ||
    typeof record.occurredAt !== 'string' ||
    !ISO_DATETIME_WITH_OFFSET_PATTERN.test(record.occurredAt) ||
    !Number.isFinite(Date.parse(record.occurredAt))
  ) {
    return null;
  }

  return {
    eventId: record.eventId,
    groupSlug: record.groupSlug.trim(),
    itemType: record.itemType as WorkingGroupFeedRealtimeEvent['itemType'],
    itemId: record.itemId,
    changeType: record.changeType as WorkingGroupFeedRealtimeEvent['changeType'],
    occurredAt: record.occurredAt,
  };
}

export function parseMessagingRealtimeEvent(
  event: string,
  payload: unknown
): MessagingRealtimeEvent | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  // Supabase adds its own `id`; accept no other fields beyond the event contract.
  const { id: _envelopeId, ...record } = payload as Record<string, unknown>;
  const conversationId = record.conversationId;
  if (typeof conversationId !== 'string' || !UUID_PATTERN.test(conversationId)) return null;

  if (event === 'conversation.created' || event === 'conversation.member_left' ||
      event === 'conversation.members_added' || event === 'conversation.renamed') {
    if (Object.keys(record).length !== 1) return null;
    return { type: event, conversationId };
  }

  if (event === 'message.created') {
    if (
      Object.keys(record).length !== 3 ||
      typeof record.messageId !== 'string' ||
      !UUID_PATTERN.test(record.messageId) ||
      typeof record.ordinal !== 'number' ||
      !Number.isSafeInteger(record.ordinal) ||
      record.ordinal < 1
    ) {
      return null;
    }
    return { type: event, conversationId, messageId: record.messageId, ordinal: record.ordinal };
  }

  if (event === 'message.updated' || event === 'reaction.changed') {
    if (
      Object.keys(record).length !== 2 ||
      typeof record.messageId !== 'string' ||
      !UUID_PATTERN.test(record.messageId)
    ) {
      return null;
    }
    return { type: event, conversationId, messageId: record.messageId };
  }

  return null;
}
