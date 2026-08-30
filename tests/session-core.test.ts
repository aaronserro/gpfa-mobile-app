import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSingleFlight,
  isSessionNearExpiry,
  isTerminalRefreshStatus,
  parseRefreshPayload,
  parseStoredSession,
} from '../src/api/session-core';

const SESSION = { accessToken: 'access', refreshToken: 'refresh', expiresAt: 2_000 };

test('refreshes sessions with missing or near expiry but not healthy sessions', () => {
  assert.equal(isSessionNearExpiry({ ...SESSION, expiresAt: null }, 1_000, 60), true);
  assert.equal(isSessionNearExpiry({ ...SESSION, expiresAt: 1_060 }, 1_000, 60), true);
  assert.equal(isSessionNearExpiry({ ...SESSION, expiresAt: 1_061 }, 1_000, 60), false);
});

test('accepts rotated Supabase tokens and resolves expires_in', () => {
  assert.deepEqual(
    parseRefreshPayload(
      { access_token: 'next-access', refresh_token: 'next-refresh', expires_in: 3_600 },
      1_000
    ),
    { accessToken: 'next-access', refreshToken: 'next-refresh', expiresAt: 4_600 }
  );
});

test('rejects incomplete refresh payloads', () => {
  assert.equal(parseRefreshPayload({ access_token: 'access', expires_in: 3_600 }, 1_000), null);
  assert.equal(
    parseRefreshPayload({ access_token: 'access', refresh_token: 'refresh' }, 1_000),
    null
  );
});

test('validates stored sessions and rejects malformed credentials', () => {
  assert.deepEqual(
    parseStoredSession(JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', expiresAt: null })),
    { accessToken: 'access', refreshToken: 'refresh', expiresAt: null }
  );
  assert.equal(parseStoredSession('{broken'), null);
  assert.equal(parseStoredSession(JSON.stringify({ accessToken: 'access', expiresAt: 2_000 })), null);
  assert.equal(
    parseStoredSession(JSON.stringify({ accessToken: 'access', refreshToken: 'refresh', expiresAt: 'soon' })),
    null
  );
});

test('classifies rejected credentials as terminal and outages as retryable', () => {
  assert.equal(isTerminalRefreshStatus(400), true);
  assert.equal(isTerminalRefreshStatus(401), true);
  assert.equal(isTerminalRefreshStatus(403), true);
  assert.equal(isTerminalRefreshStatus(429), false);
  assert.equal(isTerminalRefreshStatus(500), false);
});

test('collapses concurrent refresh operations and permits a later refresh', async () => {
  const singleFlight = createSingleFlight<number>();
  let operations = 0;
  let release: ((value: number) => void) | undefined;
  const operation = () => {
    operations += 1;
    return new Promise<number>((resolve) => {
      release = resolve;
    });
  };

  const first = singleFlight(operation);
  const second = singleFlight(operation);
  assert.equal(first, second);
  assert.equal(operations, 1);
  release?.(1);
  assert.equal(await first, 1);

  const third = singleFlight(async () => {
    operations += 1;
    return 2;
  });
  assert.equal(await third, 2);
  assert.equal(operations, 2);
});