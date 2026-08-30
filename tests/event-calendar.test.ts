import assert from 'node:assert/strict';
import test from 'node:test';

import type { MobileEventPreview } from '../src/api/types';
import {
  buildEventIcs,
  buildMonthCells,
  cursorForEvent,
  eventDayRange,
  eventIcsFilename,
  eventsOnDay,
  stepCalendarMonth,
  toNativeCalendarEvent,
  unnamedAttendeeCount,
} from '../src/lib/event-calendar';

function makeEvent(overrides: Partial<MobileEventPreview> = {}): MobileEventPreview {
  return {
    id: 'policy-roundtable',
    contentItemId: '11111111-1111-4111-8111-111111111111',
    startsAt: '2026-09-04T13:00:00Z',
    endsAt: '2026-09-04T14:30:00Z',
    timezone: 'America/New_York',
    datePrecision: 'datetime',
    detailsUrl: 'https://gpfa.org/members/events?event=policy-roundtable',
    month: 'SEP',
    day: '04',
    title: 'Global policy and regulatory roundtable',
    dateLabel: 'Friday, September 4, 2026',
    timeLabel: '9:00–10:30 AM ET',
    location: 'GPFA Member Forum',
    format: 'Virtual',
    type: 'Policy briefing',
    status: 'upcoming',
    rsvp: 'attending',
    registrationOpen: true,
    summary: 'A member-only briefing.',
    attendeeCount: 3,
    attendees: [
      { name: 'Amara Okafor', org: 'Northbridge' },
      { name: 'Daniel Weber', org: 'GPFA' },
    ],
    agenda: [],
    ...overrides,
  };
}

function unfold(ics: string): string {
  return ics.replace(/\r\n /g, '');
}

test('month cells are Sunday-first, padded to whole weeks, and include leap day', () => {
  const cells = buildMonthCells({ year: 2028, month: 1 });

  assert.equal(cells.length % 7, 0);
  assert.equal(cells[0].date.getDay(), 0);
  assert.equal(cells.at(-1)?.date.getDay(), 6);
  assert.ok(cells.some((cell) => !cell.outsideMonth && cell.date.getDate() === 29));
});

test('month stepping normalizes across year boundaries', () => {
  assert.deepEqual(stepCalendarMonth({ year: 2026, month: 11 }, 1), {
    year: 2027,
    month: 0,
  });
  assert.deepEqual(stepCalendarMonth({ year: 2026, month: 0 }, -1), {
    year: 2025,
    month: 11,
  });
});

test('event placement uses UTC calendar dates and includes every multi-day date', () => {
  const event = makeEvent({
    startsAt: '2026-09-04',
    endsAt: '2026-09-06',
    datePrecision: 'day',
  });

  assert.deepEqual(eventDayRange(event), { start: 20260904, end: 20260906 });
  assert.equal(eventsOnDay([event], 20260905)[0]?.id, event.id);
  assert.deepEqual(cursorForEvent(event), { year: 2026, month: 8 });
});

test('native calendar payload preserves timed event details', () => {
  const payload = toNativeCalendarEvent(makeEvent());

  assert.equal(payload.allDay, false);
  assert.equal(payload.startDate.toISOString(), '2026-09-04T13:00:00.000Z');
  assert.equal(payload.endDate.toISOString(), '2026-09-04T14:30:00.000Z');
  assert.equal(payload.timeZone, 'America/New_York');
  assert.match(payload.notes ?? '', /Details: https:\/\/gpfa\.org/);
});

test('native all-day payload and ICS use an exclusive end date', () => {
  const event = makeEvent({
    startsAt: '2026-09-04',
    endsAt: '2026-09-05',
    datePrecision: 'day',
  });
  const payload = toNativeCalendarEvent(event);
  const ics = buildEventIcs(event, new Date('2026-08-30T12:00:00Z'));

  assert.equal(payload.allDay, true);
  assert.equal(payload.startDate.getFullYear(), 2026);
  assert.equal(payload.startDate.getMonth(), 8);
  assert.equal(payload.startDate.getDate(), 4);
  assert.equal(payload.endDate.getFullYear(), 2026);
  assert.equal(payload.endDate.getMonth(), 8);
  assert.equal(payload.endDate.getDate(), 6);
  assert.match(ics, /DTSTART;VALUE=DATE:20260904/);
  assert.match(ics, /DTEND;VALUE=DATE:20260906/);
});

test('timed ICS defaults to one hour and escapes text values', () => {
  const ics = unfold(buildEventIcs(makeEvent({
    endsAt: undefined,
    title: 'Repo, Pledge; Title-Transfer\\Notes',
    location: 'London, UK',
  }), new Date('2026-08-30T12:00:00Z')));

  assert.match(ics, /DTSTART:20260904T130000Z/);
  assert.match(ics, /DTEND:20260904T140000Z/);
  assert.match(ics, /SUMMARY:Repo\\, Pledge\\; Title-Transfer\\\\Notes/);
  assert.match(ics, /LOCATION:London\\, UK/);
  assert.match(ics, /URL:https:\/\/gpfa\.org\/members\/events/);
  assert.ok(ics.includes('\r\n'));
});

test('ICS filenames are safe and always end in .ics', () => {
  assert.equal(eventIcsFilename('GPFA Annual Meeting 2026!'), 'gpfa-annual-meeting-2026.ics');
  assert.equal(eventIcsFilename('!!!'), 'event.ics');
});

test('attendee reconciliation reports only the unnamed remainder', () => {
  assert.equal(unnamedAttendeeCount(makeEvent()), 1);
  assert.equal(
    unnamedAttendeeCount(makeEvent({ attendeeCount: 1 })),
    0
  );
});
