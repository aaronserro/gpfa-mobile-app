import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advanceAskResearchPhase,
  completeAskTraceRow,
  createAskSseParser,
  normalizeAskSource,
  normalizeAskSources,
} from '../src/api/ask-stream';
import { askSourceDestination, trustedAskSourceUrl } from '../src/lib/ask-source-navigation';
import type { AskStreamEvent, AskTraceRow } from '../src/api/types';

const encoder = new TextEncoder();

function source(overrides: Record<string, unknown> = {}) {
  return {
    rank: 1,
    type: 'discussion',
    label: 'Working group',
    title: 'Collateral discussion',
    href: '/members/groups/collateral-liquidity?thread=pilot',
    excerpt: null,
    updatedAt: null,
    ...overrides,
  };
}

test('decodes SSE events across UTF-8 and frame boundaries', () => {
  const events: AskStreamEvent[] = [];
  const parser = createAskSseParser((event) => events.push(event));
  const bytes = encoder.encode('event: text_delta\r\ndata: {"type":"text_delta","text":"Peer 🌍"}\r\n\r\n');
  const emojiStart = bytes.findIndex((value) => value === 0xf0);

  parser.push(bytes.slice(0, emojiStart + 2));
  assert.deepEqual(events, []);
  parser.push(bytes.slice(emojiStart + 2, bytes.length - 1));
  assert.deepEqual(events, []);
  parser.push(bytes.slice(bytes.length - 1));
  parser.finish();

  assert.deepEqual(events, [{ type: 'text_delta', text: 'Peer 🌍' }]);
});

test('joins multiline data fields and ignores unknown future events', () => {
  const events: AskStreamEvent[] = [];
  const parser = createAskSseParser((event) => events.push(event));
  parser.push(encoder.encode(
    'event: text_delta\ndata: {"type":"text_delta",\ndata: "text":"A"}\n\n' +
    'event: progress_hint\ndata: {"type":"progress_hint","value":2}\n\n'
  ));
  parser.finish();
  assert.deepEqual(events, [{ type: 'text_delta', text: 'A' }]);
});

test('rejects malformed known stream events', () => {
  const parser = createAskSseParser(() => {});
  assert.throws(
    () => parser.push(encoder.encode('event: text_delta\ndata: {"type":"text_delta"}\n\n')),
    /invalid text update/
  );
});

test('sorts and deduplicates structured sources', () => {
  const sources = normalizeAskSources([
    source({ rank: 2 }),
    source({ rank: 1, type: 'event', title: 'Roundtable', href: '/members/events?event=roundtable' }),
    source({ rank: 3 }),
  ]);
  assert.deepEqual(sources.map((item) => item.type), ['event', 'discussion']);
  assert.deepEqual(sources.map((item) => item.rank), [1, 2]);
});

test('rejects external, traversal, fragmented, and UUID member source routes', () => {
  for (const invalid of [
    source({ href: 'https://attacker.example/members/groups/a' }),
    source({ href: '/members/groups/../admin' }),
    source({ href: '/members/groups/%2e%2e/admin' }),
    source({ href: '/members/groups/a#private' }),
    source({ type: 'member', href: '/members/directory/org/10000000-0000-4000-8000-000000000001' }),
  ]) {
    assert.throws(() => normalizeAskSource(invalid), /invalid source destination/);
  }
});

test('research phases remain monotonic and tool results close the latest matching row', () => {
  assert.equal(advanceAskResearchPhase('reviewing', 'searching'), 'reviewing');
  assert.equal(advanceAskResearchPhase('searching', 'answering'), 'answering');
  const trace: AskTraceRow[] = [
    { id: '1', name: 'search', summary: 'First', status: 'pending' },
    { id: '2', name: 'search', summary: 'Second', status: 'pending' },
  ];
  assert.deepEqual(completeAskTraceRow(trace, 'search').map((row) => row.status), ['pending', 'done']);
});

test('routes supported sources natively and keeps fallback on the trusted origin', () => {
  assert.deepEqual(
    askSourceDestination(normalizeAskSource(source())),
    { kind: 'group', slug: 'collateral-liquidity' }
  );
  assert.deepEqual(
    askSourceDestination(normalizeAskSource(source({ type: 'event', href: '/members/events?event=roundtable' }))),
    { kind: 'event', id: 'roundtable' }
  );
  assert.equal(
    trustedAskSourceUrl('/members/library/item?download=1', 'https://www.gpfa.example'),
    'https://www.gpfa.example/members/library/item?download=1'
  );
  assert.equal(trustedAskSourceUrl('//attacker.example/item', 'https://www.gpfa.example'), null);
});
