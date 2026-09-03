import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseMessagingRealtimeEvent,
  parseWorkingGroupFeedRealtimeEvent,
} from '../src/api/realtime-events';
import type { MessageItem } from '../src/api/types';
import {
  memberRealtimeRetryDelayMs,
  mergeRealtimeMessages,
  rememberBoundedId,
} from '../src/lib/realtime-state';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';
const MESSAGE_ID = '22222222-2222-4222-8222-222222222222';
const EVENT_ID = '33333333-3333-4333-8333-333333333333';

function message(id: string, ordinal: number, content = id): MessageItem {
  return {
    id,
    conversationId: CONVERSATION_ID,
    senderId: '44444444-4444-4444-8444-444444444444',
    content,
    clientNonce: '55555555-5555-4555-8555-555555555555',
    ordinal,
    createdAt: '2026-08-31T12:00:00.000Z',
    editedAt: null,
    kind: 'text',
    reactions: [],
  };
}

test('parses the strict messaging broadcast envelope without message content', () => {
  assert.deepEqual(
    parseMessagingRealtimeEvent('message.created', {
      id: 'realtime-envelope-id',
      conversationId: CONVERSATION_ID,
      messageId: MESSAGE_ID,
      ordinal: 42,
    }),
    {
      type: 'message.created',
      conversationId: CONVERSATION_ID,
      messageId: MESSAGE_ID,
      ordinal: 42,
    }
  );

  assert.equal(
    parseMessagingRealtimeEvent('message.created', {
      conversationId: CONVERSATION_ID,
      messageId: MESSAGE_ID,
      ordinal: 42,
      content: 'must not be accepted',
    }),
    null
  );
  assert.deepEqual(
    parseMessagingRealtimeEvent('message.updated', {
      id: 'realtime-envelope-id',
      conversationId: CONVERSATION_ID,
      messageId: MESSAGE_ID,
    }),
    { type: 'message.updated', conversationId: CONVERSATION_ID, messageId: MESSAGE_ID }
  );
  assert.equal(
    parseMessagingRealtimeEvent('message.updated', {
      conversationId: CONVERSATION_ID,
      messageId: MESSAGE_ID,
      content: 'must be fetched canonically',
    }),
    null
  );
  assert.equal(parseMessagingRealtimeEvent('unknown', { conversationId: CONVERSATION_ID }), null);
});

test('parses working-group events and rejects malformed identifiers', () => {
  const event = {
    eventId: EVENT_ID,
    groupSlug: 'operations',
    itemType: 'discussion',
    itemId: MESSAGE_ID,
    changeType: 'created',
    occurredAt: '2026-08-31T12:00:00.000Z',
  };
  assert.deepEqual(parseWorkingGroupFeedRealtimeEvent(event), event);
  assert.equal(parseWorkingGroupFeedRealtimeEvent({ ...event, itemId: 'not-a-uuid' }), null);
  assert.equal(parseWorkingGroupFeedRealtimeEvent({ ...event, occurredAt: 'not-a-date' }), null);
});

test('bounds realtime retries and event-id memory', () => {
  assert.equal(memberRealtimeRetryDelayMs(0), 1_000);
  assert.equal(memberRealtimeRetryDelayMs(3), 8_000);
  assert.equal(memberRealtimeRetryDelayMs(10), 15_000);

  const ids: string[] = [];
  assert.equal(rememberBoundedId(ids, 'one', 2), false);
  assert.equal(rememberBoundedId(ids, 'one', 2), true);
  assert.equal(rememberBoundedId(ids, 'two', 2), false);
  assert.equal(rememberBoundedId(ids, 'three', 2), false);
  assert.deepEqual(ids, ['two', 'three']);
});

test('merges overlapping canonical message windows by id and ordinal', () => {
  const first = message('first', 10, 'old first');
  const second = message('second', 20, 'old second');
  const updatedSecond = message('second', 20, 'edited second');
  const third = message('third', 30, 'third');

  assert.deepEqual(
    mergeRealtimeMessages([second, first], [third, updatedSecond]),
    [first, updatedSecond, third]
  );

  const unsentSecond = {
    ...updatedSecond,
    content: 'Robert Goobie unsent a message',
    editedAt: null,
    kind: 'system' as const,
    reactions: [],
  };
  assert.deepEqual(
    mergeRealtimeMessages([first, updatedSecond, third], [unsentSecond]),
    [first, unsentSecond, third]
  );
});
