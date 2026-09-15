import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_WORKING_GROUP_FEED_CONTROLS,
  hasActiveWorkingGroupFeedControls,
} from '../src/lib/workingGroupFeedControls';
import { displayedWorkingGroupUpvote } from '../src/lib/working-group-upvotes';

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

test('canonical working-group upvotes are not counted twice after detail refresh', () => {
  assert.deepEqual(
    displayedWorkingGroupUpvote({ upvotes: 8, hasUpvoted: true }, true),
    { selected: true, count: 8 }
  );
  assert.deepEqual(
    displayedWorkingGroupUpvote({ upvotes: 8, hasUpvoted: true }, false),
    { selected: false, count: 7 }
  );
  assert.deepEqual(
    displayedWorkingGroupUpvote({ upvotes: 7, hasUpvoted: false }, true),
    { selected: true, count: 8 }
  );
});
