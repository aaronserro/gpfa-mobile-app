import assert from 'node:assert/strict';
import test from 'node:test';

import { ROUTES } from '../src/api/config';

test('directory profile route encodes the member id', () => {
  assert.equal(
    ROUTES.directoryMemberProfile('member/id'),
    '/api/members/directory/profiles/member%2Fid'
  );
});

test('directory profile activity route preserves kind and page', () => {
  assert.equal(
    ROUTES.directoryMemberProfileActivity('member-id', 'replies', 2),
    '/api/members/directory/profiles/member-id/activity?kind=replies&page=2'
  );
});
