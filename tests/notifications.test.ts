import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeNotification, normalizeNotifications } from '../src/api/notification-normalization';
import type { MemberNotification } from '../src/api/types';
import { notificationDestination } from '../src/lib/notification-navigation';
import {
  dismissNotificationItems,
  markNotificationItemsRead,
  notificationIsBeforeMemberJoin,
  prependNotificationItem,
} from '../src/lib/notification-state';

function notification(overrides: Partial<MemberNotification> = {}): MemberNotification {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'announcement',
    title: 'Policy update',
    body: 'Read the latest update.',
    createdAt: '2026-08-30T12:00:00.000Z',
    time: '2026-08-30T12:00:00.000Z',
    targetType: 'site',
    read: false,
    ...overrides,
  };
}

test('normalizes canonical API responses and preserves membership boundary', () => {
  const result = normalizeNotifications({
    status: 'success',
    memberCreatedAt: '2026-01-01T00:00:00.000Z',
    notifications: [{
      id: '11111111-1111-4111-8111-111111111111',
      kind: 'event_published',
      title: 'New Event',
      body: 'Annual forum',
      navigation_href: '/members/events?event=annual-forum',
      target_type: 'site',
      target_id: null,
      created_at: '2026-08-30T12:00:00.000Z',
      content_type: 'event',
      content_id: '22222222-2222-4222-8222-222222222222',
      content_deleted_at: null,
      readAt: null,
    }],
  });

  assert.equal(result.memberCreatedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(result.notifications[0]?.createdAt, '2026-08-30T12:00:00.000Z');
  assert.equal(result.notifications[0]?.read, false);
  assert.equal(result.notifications[0]?.href, '/members/events?event=annual-forum');
});

test('drops malformed realtime rows without logging private notification copy', () => {
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...values: unknown[]) => warnings.push(values);
  try {
    const result = normalizeNotification({
      id: '11111111-1111-4111-8111-111111111111',
      kind: 'working_group_reply',
      title: 'Private title',
      body: 'Private body',
    }, 0, 'realtime');
    assert.equal(result, null);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(JSON.stringify(warnings).includes('Private title'), false);
  assert.equal(JSON.stringify(warnings).includes('Private body'), false);
});

test('notification list mutations are immutable, deduplicated, and bounded', () => {
  const first = notification();
  const original = [first];
  const read = markNotificationItemsRead(original, [first.id]);
  assert.notEqual(read, original);
  assert.equal(read[0]?.read, true);
  assert.equal(first.read, false);

  assert.deepEqual(dismissNotificationItems(read, [first.id]), []);
  assert.equal(prependNotificationItem(original, first), original);

  const existing = Array.from({ length: 30 }, (_, index) =>
    notification({ id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` })
  );
  const prepended = prependNotificationItem(existing, notification({ id: 'new-notification' }));
  assert.equal(prepended.length, 30);
  assert.equal(prepended[0]?.id, 'new-notification');
});

test('membership boundary rejects only valid timestamps before join', () => {
  assert.equal(
    notificationIsBeforeMemberJoin(notification(), '2026-08-30T13:00:00.000Z'),
    true
  );
  assert.equal(notificationIsBeforeMemberJoin(notification(), 'invalid'), false);
});

test('maps every supported native notification destination', () => {
  assert.deepEqual(notificationDestination(notification({
    contentType: 'announcement', contentId: 'announcement-1', href: '/members/announcements/announcement-1',
  })), { kind: 'announcement', id: 'announcement-1' });
  assert.deepEqual(notificationDestination(notification({
    contentType: 'survey', contentId: 'survey-1', href: '/members/surveys/survey-1',
  })), { kind: 'survey', id: 'survey-1' });
  assert.deepEqual(notificationDestination(notification({
    contentType: 'event', contentId: 'event-content-1', href: '/members/events?event=event-slug',
  })), { kind: 'event', ids: ['event-content-1', 'event-slug'] });
  assert.deepEqual(notificationDestination(notification({ href: '/members/groups/climate-finance' })), {
    kind: 'group', slug: 'climate-finance',
  });
  assert.deepEqual(notificationDestination(notification({ href: '/members/groups/climate-finance/post-1' })), {
    kind: 'group-item', slug: 'climate-finance', id: 'post-1', itemType: 'discussion',
  });
  assert.deepEqual(notificationDestination(notification({ href: '/members/groups/climate-finance/polls/poll-1' })), {
    kind: 'group-item', slug: 'climate-finance', id: 'poll-1', itemType: 'poll',
  });
  assert.deepEqual(notificationDestination(notification({ kind: 'annual_meeting_registration_confirmed' })), {
    kind: 'annual-meeting',
  });
});

test('deleted, external, traversal, and unsupported destinations fail safely', () => {
  assert.deepEqual(notificationDestination(notification({
    contentType: 'working_group_post', contentDeletedAt: '2026-08-30T13:00:00.000Z',
  })), { kind: 'deleted', label: 'working group post' });
  assert.deepEqual(notificationDestination(notification({ href: 'https://evil.example/members/events' })), {
    kind: 'unsupported',
  });
  assert.deepEqual(notificationDestination(notification({ href: '/members/groups/../admin' })), {
    kind: 'unsupported',
  });
  assert.deepEqual(notificationDestination(notification({ href: '/members/library/private-report' })), {
    kind: 'unsupported',
  });
});
