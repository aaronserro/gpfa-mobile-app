import type { MobileEventPreview } from '../api/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface CalendarCursor {
  year: number;
  month: number;
}

export interface CalendarCell {
  date: Date;
  dayKey: number;
  outsideMonth: boolean;
}

export interface NativeCalendarEventInput {
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  timeZone?: string;
  location?: string;
  notes?: string;
  url?: string;
}

interface ParsedEventDate {
  date: Date;
  hasTime: boolean;
}

/** Bare dates stay anchored to their intended calendar day in every timezone. */
export function parseEventDate(
  value: string,
  datePrecision?: MobileEventPreview['datePrecision']
): ParsedEventDate {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('This event has an invalid date.');
  }

  const inferredHasTime =
    value.includes('T') &&
    (date.getUTCHours() !== 0 ||
      date.getUTCMinutes() !== 0 ||
      date.getUTCSeconds() !== 0);

  return {
    date,
    hasTime: datePrecision ? datePrecision === 'datetime' : inferredHasTime,
  };
}

export function utcDayKey(date: Date): number {
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

export function localDayKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function eventDayRange(event: MobileEventPreview): { start: number; end: number } {
  const start = utcDayKey(parseEventDate(event.startsAt, event.datePrecision).date);
  const end = event.endsAt
    ? utcDayKey(parseEventDate(event.endsAt, event.datePrecision).date)
    : start;
  return { start, end: Math.max(start, end) };
}

/** Sunday-first calendar grid padded to complete weeks. */
export function buildMonthCells({ year, month }: CalendarCursor): CalendarCell[] {
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < startDay; index += 1) {
    const date = new Date(year, month, 1 - startDay + index);
    cells.push({ date, dayKey: localDayKey(date), outsideMonth: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, dayKey: localDayKey(date), outsideMonth: false });
  }

  for (let day = 1; cells.length % 7 !== 0; day += 1) {
    const date = new Date(year, month, daysInMonth + day);
    cells.push({ date, dayKey: localDayKey(date), outsideMonth: true });
  }

  return cells;
}

export function eventsOnDay(events: MobileEventPreview[], dayKey: number): MobileEventPreview[] {
  return events.filter((event) => {
    const range = eventDayRange(event);
    return dayKey >= range.start && dayKey <= range.end;
  });
}

export function cursorForEvent(event: MobileEventPreview): CalendarCursor {
  const date = parseEventDate(event.startsAt, event.datePrecision).date;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function stepCalendarMonth(cursor: CalendarCursor, delta: number): CalendarCursor {
  const next = new Date(cursor.year, cursor.month + delta, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

export function unnamedAttendeeCount(event: Pick<MobileEventPreview, 'attendeeCount' | 'attendees'>): number {
  return Math.max(0, event.attendeeCount - event.attendees.length);
}

export function toNativeCalendarEvent(event: MobileEventPreview): NativeCalendarEventInput {
  const start = parseEventDate(event.startsAt, event.datePrecision);
  const parsedEnd = event.endsAt
    ? parseEventDate(event.endsAt, event.datePrecision).date
    : null;
  // Native all-day events use local calendar midnights. Rebuild from the UTC
  // date tuple so devices west of UTC do not display the preceding day.
  const nativeStart = start.hasTime
    ? start.date
    : new Date(
        start.date.getUTCFullYear(),
        start.date.getUTCMonth(),
        start.date.getUTCDate()
      );
  const lastAllDay = parsedEnd ?? start.date;
  const endDate = start.hasTime
    ? parsedEnd ?? new Date(start.date.getTime() + HOUR_MS)
    : new Date(
        lastAllDay.getUTCFullYear(),
        lastAllDay.getUTCMonth(),
        lastAllDay.getUTCDate() + 1
      );
  const notes = [event.summary.trim(), `Details: ${event.detailsUrl}`]
    .filter(Boolean)
    .join('\n\n');

  return {
    title: event.title,
    startDate: nativeStart,
    endDate,
    allDay: !start.hasTime,
    ...(event.timezone ? { timeZone: event.timezone } : {}),
    ...(event.location ? { location: event.location } : {}),
    ...(notes ? { notes } : {}),
    ...(event.detailsUrl ? { url: event.detailsUrl } : {}),
  };
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function toDateValue(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function eventIcsFilename(title: string, fallback = 'event'): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const fallbackSlug = fallback
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || fallbackSlug || 'event'}.ics`;
}

export function buildEventIcs(event: MobileEventPreview, now = new Date()): string {
  const start = parseEventDate(event.startsAt, event.datePrecision);
  const parsedEnd = event.endsAt
    ? parseEventDate(event.endsAt, event.datePrecision).date
    : null;
  const description = [event.summary.trim(), `Details: ${event.detailsUrl}`]
    .filter(Boolean)
    .join('\n\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GPFA//Mobile Member Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@globalpeerfinancingassociation.org`,
    `DTSTAMP:${toUtcStamp(now)}`,
  ];

  if (start.hasTime) {
    const end = parsedEnd ?? new Date(start.date.getTime() + HOUR_MS);
    lines.push(`DTSTART:${toUtcStamp(start.date)}`, `DTEND:${toUtcStamp(end)}`);
  } else {
    const exclusiveEnd = new Date((parsedEnd ?? start.date).getTime() + DAY_MS);
    lines.push(
      `DTSTART;VALUE=DATE:${toDateValue(start.date)}`,
      `DTEND;VALUE=DATE:${toDateValue(exclusiveEnd)}`
    );
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.detailsUrl) lines.push(`URL:${event.detailsUrl}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldLine).join('\r\n');
}
