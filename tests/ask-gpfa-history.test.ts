import assert from 'node:assert/strict';
import test from 'node:test';

import { isAskConversationId, mergeAskMessages } from '../src/lib/ask-gpfa-core';
import type { AskMessage } from '../src/api/types';

function message(id: string, createdAt: string, text = id): AskMessage {
  return { id, role: 'user', text, createdAt, sources: [] };
}

test('accepts stored conversation UUIDs and rejects malformed values', () => {
  assert.equal(isAskConversationId('10000000-0000-4000-8000-000000000001'), true);
  assert.equal(isAskConversationId('not-a-conversation'), false);
  assert.equal(isAskConversationId(null), false);
});

test('prepends earlier messages chronologically without duplicate ids', () => {
  const current = [
    message('b', '2026-08-29T12:01:00.000Z'),
    message('c', '2026-08-29T12:02:00.000Z'),
  ];
  const earlier = [
    message('a', '2026-08-29T12:00:00.000Z'),
    message('b', '2026-08-29T12:01:00.000Z', 'duplicate'),
  ];

  const merged = mergeAskMessages(current, earlier);
  assert.deepEqual(merged.map((item) => item.id), ['a', 'b', 'c']);
  assert.equal(merged[1]?.text, 'b');
});

test('uses message id as the stable tie-break for equal timestamps', () => {
  const createdAt = '2026-08-29T12:00:00.000Z';
  const merged = mergeAskMessages([message('b', createdAt)], [message('a', createdAt)]);
  assert.deepEqual(merged.map((item) => item.id), ['a', 'b']);
});
