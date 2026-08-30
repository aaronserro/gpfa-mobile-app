import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_WORKING_GROUP_FEED_CONTROLS,
  hasActiveWorkingGroupFeedControls,
} from '../src/lib/workingGroupFeedControls';

test('working-group feeds default to the same open view as the web app', () => {
  assert.deepEqual(DEFAULT_WORKING_GROUP_FEED_CONTROLS, {
    query: '',
    type: 'all',
    status: 'open',
    sort: 'newest',
  });
  assert.equal(
    hasActiveWorkingGroupFeedControls(DEFAULT_WORKING_GROUP_FEED_CONTROLS),
    false
  );
});

test('any status remains an active selectable filter', () => {
  assert.equal(
    hasActiveWorkingGroupFeedControls({
      ...DEFAULT_WORKING_GROUP_FEED_CONTROLS,
      status: 'any',
    }),
    true
  );
});

test('each search, type, status, and sort deviation enables clear filters', () => {
  const changes = [
    { query: 'liquidity' },
    { type: 'poll' as const },
    { status: 'closed' as const },
    { sort: 'recently_active' as const },
  ];

  for (const change of changes) {
    assert.equal(
      hasActiveWorkingGroupFeedControls({
        ...DEFAULT_WORKING_GROUP_FEED_CONTROLS,
        ...change,
      }),
      true
    );
  }
});
