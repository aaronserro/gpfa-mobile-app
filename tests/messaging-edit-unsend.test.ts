import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import type { ConversationSummary, MessageItem } from '../src/api/types';
import {
  MESSAGE_EDIT_WINDOW_MS,
  isMessageWithinEditWindow,
  messageContentError,
  messageUpdatedWindowQuery,
  normalizeMessageContent,
  replaceConversationLastMessage,
  replaceMessageById,
} from '../src/lib/messages';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';

function message(id: string, ordinal: number, overrides: Partial<MessageItem> = {}): MessageItem {
  return {
    id,
    conversationId: CONVERSATION_ID,
    senderId: MEMBER_ID,
    content: `Message ${ordinal}`,
    clientNonce: `33333333-3333-4333-8333-${String(ordinal).padStart(12, '0')}`,
    ordinal,
    createdAt: '2026-09-01T12:00:00.000Z',
    editedAt: null,
    kind: 'text',
    reactions: [],
    ...overrides,
  };
}

function conversation(lastMessage: MessageItem | null): ConversationSummary {
  return {
    id: CONVERSATION_ID,
    kind: 'direct',
    title: null,
    canSend: true,
    blockedByCurrentMember: false,
    participants: [],
    lastMessage,
    lastMessageAt: '2026-09-01T12:05:00.000Z',
    lastReaction: null,
    lastReadOrdinal: 0,
    unreadCount: 0,
  };
}

test('uses a strict five-minute edit window', () => {
  const createdAt = '2026-09-01T12:00:00.000Z';
  const start = Date.parse(createdAt);
  assert.equal(isMessageWithinEditWindow(createdAt, start), true);
  assert.equal(isMessageWithinEditWindow(createdAt, start + MESSAGE_EDIT_WINDOW_MS - 1), true);
  assert.equal(isMessageWithinEditWindow(createdAt, start + MESSAGE_EDIT_WINDOW_MS), false);
  assert.equal(isMessageWithinEditWindow(createdAt, start + MESSAGE_EDIT_WINDOW_MS + 1), false);
  assert.equal(isMessageWithinEditWindow('not-a-date', start), false);
});

test('normalizes and validates message content like the server contract', () => {
  assert.equal(normalizeMessageContent('  first\r\nsecond  '), 'first\nsecond');
  assert.equal(messageContentError('  '), 'Message content is required.');
  assert.equal(messageContentError('a'.repeat(4_000)), null);
  assert.equal(
    messageContentError('a'.repeat(4_001)),
    'Message content must be 4,000 characters or fewer.'
  );
  assert.equal(
    messageContentError('unsupported\u0000control'),
    'Message content contains unsupported control characters.'
  );
});

test('replaces one authoritative message immutably without changing order', () => {
  const first = message('first', 1);
  const second = message('second', 2);
  const edited = message('first', 1, {
    content: 'Edited content',
    editedAt: '2026-09-01T12:02:00.000Z',
  });
  const current = [first, second];
  const next = replaceMessageById(current, edited);

  assert.deepEqual(next, [edited, second]);
  assert.deepEqual(current, [first, second]);
});

test('replaces only a matching last-message preview without reordering activity', () => {
  const original = message('last', 2);
  const edited = message('last', 2, { content: 'Updated preview' });
  const other = { ...conversation(message('other', 4)), id: 'another-conversation' };
  const current = [conversation(original), other];
  const next = replaceConversationLastMessage(current, edited);

  assert.equal(next[0].lastMessage?.content, 'Updated preview');
  assert.equal(next[0].lastMessageAt, current[0].lastMessageAt);
  assert.equal(next[1], other);
  assert.deepEqual(current[0].lastMessage, original);
});

test('targets a loaded updated ordinal and otherwise requests the latest window', () => {
  const loaded = message('loaded', 120);
  assert.deepEqual(messageUpdatedWindowQuery([loaded], loaded.id), {
    beforeOrdinal: 121,
    limit: 1,
  });
  assert.deepEqual(messageUpdatedWindowQuery([loaded], 'not-loaded'), { limit: 50 });
});

test('wires authoritative edit and unsend through the repository and thread', () => {
  const portal = readFileSync(resolve('src/api/portal.ts'), 'utf8');
  const app = readFileSync(resolve('App.tsx'), 'utf8');
  const thread = readFileSync(resolve('src/components/directory/ConversationThread.tsx'), 'utf8');
  const inbox = readFileSync(resolve('src/components/directory/MessagesInbox.tsx'), 'utf8');
  const screen = readFileSync(resolve('src/screens/DirectoryScreen.tsx'), 'utf8');

  assert.match(portal, /export function editMemberMessage\(/);
  assert.match(portal, /method: 'PATCH'/);
  assert.match(portal, /export function unsendMemberMessage\(/);
  assert.match(portal, /method: 'DELETE'/);
  assert.match(portal, /kind: 'system'/);
  assert.match(portal, /reactions: \[\]/);

  assert.match(app, /replaceMessageById\(current, response\.message\)/);
  assert.match(app, /replaceConversationLastMessage\(current, response\.message\)/);
  assert.match(app, /messageUpdatedWindowQuery\(messageItemsRef\.current, event\.messageId\)/);

  assert.match(thread, /accessibilityLabel="Edit message"/);
  assert.match(thread, /accessibilityLabel="Unsend message"/);
  assert.match(thread, /Alert\.alert\(/);
  assert.match(thread, /style: 'destructive'/);
  assert.match(thread, /setEditError\(cause instanceof Error/);
  assert.match(thread, /message\.editedAt \? ' · Edited' : ''/);
  assert.match(inbox, /onEditMessage=\{onEditMessage\}/);
  assert.match(screen, /onUnsendMessage=\{onUnsendMessage\}/);
});
