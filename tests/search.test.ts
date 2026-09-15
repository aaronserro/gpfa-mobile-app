import assert from 'node:assert/strict';
import test from 'node:test';

import { parseMemberHref } from '../src/lib/notification-navigation';
import {
  searchResultDestination,
  trustedMemberWebUrl,
} from '../src/lib/search-result-navigation';
import { MEMBER_SEARCH_DOCUMENTS } from '../src/data/fixtures';

const WEB_ORIGIN = 'https://www.gpfa.org';

test('maps member and organization search documents to native directory destinations', () => {
  assert.deepEqual(
    searchResultDestination('/members/directory/ontario-pension-plan/alex-morgan', WEB_ORIGIN),
    {
      kind: 'member-profile',
      organizationSlug: 'ontario-pension-plan',
      mentionHandle: 'alex-morgan',
    }
  );
  assert.deepEqual(
    searchResultDestination('/members/directory/ontario-pension-plan', WEB_ORIGIN),
    { kind: 'organization', slug: 'ontario-pension-plan' }
  );
});

test('maps working-group, discussion, and poll search documents to native destinations', () => {
  assert.deepEqual(searchResultDestination('/members/groups/risk', WEB_ORIGIN), {
    kind: 'group',
    slug: 'risk',
  });
  assert.deepEqual(
    searchResultDestination('/members/groups/technology/thread-1', WEB_ORIGIN),
    { kind: 'group-item', slug: 'technology', id: 'thread-1', itemType: 'discussion' }
  );
  assert.deepEqual(
    searchResultDestination('/members/groups/technology/polls/poll-1', WEB_ORIGIN),
    { kind: 'group-item', slug: 'technology', id: 'poll-1', itemType: 'poll' }
  );
});

test('maps event, library, podcast, and job content to native destinations', () => {
  assert.deepEqual(
    searchResultDestination('/members/events?event=annual-member-meeting-2026', WEB_ORIGIN),
    { kind: 'event', id: 'annual-member-meeting-2026' }
  );
  assert.deepEqual(
    searchResultDestination('/members/library/indemnification-comparison', WEB_ORIGIN),
    { kind: 'resource', slug: 'indemnification-comparison' }
  );
  assert.deepEqual(
    searchResultDestination('/members/podcasts/indemnification', WEB_ORIGIN),
    { kind: 'podcast', slug: 'indemnification' }
  );
  assert.deepEqual(searchResultDestination('/members/job-board?job=job-1', WEB_ORIGIN), {
    kind: 'job',
    id: 'job-1',
  });
});

test('maps supported member content to existing native surfaces', () => {
  assert.deepEqual(searchResultDestination('/members/annual-meeting', WEB_ORIGIN), {
    kind: 'annual-meeting',
  });
  assert.deepEqual(
    searchResultDestination('/members/announcements/announcement-1', WEB_ORIGIN),
    { kind: 'announcement', id: 'announcement-1' }
  );
  assert.deepEqual(searchResultDestination('/members/surveys/survey-1', WEB_ORIGIN), {
    kind: 'survey',
    id: 'survey-1',
  });
});

test('uses the configured HTTPS origin for valid indexed routes without native screens', () => {
  assert.deepEqual(searchResultDestination('/members/governance-handbook', WEB_ORIGIN), {
    kind: 'web',
    url: 'https://www.gpfa.org/members/governance-handbook',
  });
  assert.deepEqual(searchResultDestination('/about/jane-smith', WEB_ORIGIN), {
    kind: 'web',
    url: 'https://www.gpfa.org/about/jane-smith',
  });
  assert.deepEqual(searchResultDestination('/members/polls/poll-2', WEB_ORIGIN), {
    kind: 'web',
    url: 'https://www.gpfa.org/members/polls/poll-2',
  });
});

test('every representative indexed fixture has a safe destination', () => {
  for (const result of MEMBER_SEARCH_DOCUMENTS) {
    assert.ok(searchResultDestination(result.href, WEB_ORIGIN), `${result.kind}: ${result.href}`);
  }
});

test('native query routes require one safe, correctly named parameter', () => {
  assert.deepEqual(
    searchResultDestination('/members/events?event=policy-roundtable&next=other', WEB_ORIGIN),
    {
      kind: 'web',
      url: 'https://www.gpfa.org/members/events?event=policy-roundtable&next=other',
    }
  );
  assert.deepEqual(searchResultDestination('/members/job-board?job=job%2Fadmin', WEB_ORIGIN), {
    kind: 'web',
    url: 'https://www.gpfa.org/members/job-board?job=job%2Fadmin',
  });
  assert.deepEqual(searchResultDestination('/members/events?event=', ''), null);
});

test('strict member href parsing rejects external, traversal, encoded separator, and fragment values', () => {
  const rejected = [
    'https://evil.example/members/events?event=event-1',
    'http://www.gpfa.org/members/events?event=event-1',
    '//evil.example/members/events?event=event-1',
    '/members/groups/../admin',
    '/members/groups/%2e%2e/admin',
    '/members/groups/%252e%252e/admin',
    '/members/groups/risk%2fadmin',
    '/members/groups/risk%252fadmin',
    '/members\\groups\\risk',
    '/members/groups/risk#moderation',
    '/members/groups/risk\n',
  ];

  for (const href of rejected) {
    assert.equal(parseMemberHref(href), null, href);
    assert.equal(searchResultDestination(href, WEB_ORIGIN), null, href);
  }
});

test('trusted web fallback rejects insecure, malformed, credentialed, and path-bearing origins', () => {
  assert.equal(trustedMemberWebUrl('/about/jane-smith', 'http://www.gpfa.org'), null);
  assert.equal(trustedMemberWebUrl('/about/jane-smith', 'https://evil.example/path'), null);
  assert.equal(trustedMemberWebUrl('/about/jane-smith', 'https://user:pass@www.gpfa.org'), null);
  assert.equal(trustedMemberWebUrl('/about/jane-smith', 'not-an-origin'), null);
  assert.equal(trustedMemberWebUrl('https://evil.example/about/jane-smith', WEB_ORIGIN), null);
  assert.equal(searchResultDestination('/about/jane-smith', ''), null);
});
