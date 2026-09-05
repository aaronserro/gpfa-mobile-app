import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT = join(import.meta.dirname, '..');

function source(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

test('authenticated API requests share one 401 refresh and retry policy', () => {
  const client = source('src/api/client.ts');

  assert.doesNotMatch(client, /preserveSessionOnUnauthorized/);
  assert.match(client, /if \(!anonymous && response\.status === 401\)/);
  assert.match(client, /token = await refreshForRetry\(token\)/);
  assert.match(client, /if \(response\.status === 401 \|\| response\.status === 403\) onUnauthorized\?\.\(\)/);
});

test('Home and Ask history use the standard authenticated request path', () => {
  const portal = source('src/api/portal.ts');

  assert.match(
    portal,
    /return request<HomeImmediateActionsResponse>\(ROUTES\.homeImmediateActions\);/,
  );
  assert.match(
    portal,
    /return request<unknown>\(ROUTES\.askConversations\)\.then\(\(payload\) =>/,
  );
  assert.doesNotMatch(portal, /preserveSessionOnUnauthorized/);
});
