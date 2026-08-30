import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MobileEventPreview } from '../api/types';
import { CaretLeft, CaretRight } from '../ds/icons';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';
import {
  buildMonthCells,
  eventsOnDay,
  localDayKey,
  stepCalendarMonth,
  type CalendarCursor,
} from '../lib/event-calendar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOT_LIMIT = 3;

export function EventMonthCalendar({
  events,
  onSelectEvent,
}: {
  events: MobileEventPreview[];
  onSelectEvent: (eventId: string) => void;
}) {
  const { t } = useTheme();
  const now = new Date();
  const todayKey = localDayKey(now);
  const [cursor, setCursor] = useState<CalendarCursor>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);
  const selectedEvents = useMemo(
    () => eventsOnDay(events, selectedDayKey),
    [events, selectedDayKey]
  );
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
  });
  const onCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  function moveMonth(delta: number) {
    const next = stepCalendarMonth(cursor, delta);
    setCursor(next);
    setSelectedDayKey(localDayKey(new Date(next.year, next.month, 1)));
  }

  function goToday() {
    const today = new Date();
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDayKey(localDayKey(today));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.monthLine}>
          <Text style={[styles.month, { color: t.inkStrong }]}>{monthLabel}</Text>
          <Text style={[styles.year, { color: t.inkMuted }]}>{cursor.year}</Text>
        </View>
        <View style={styles.controls}>
          <Pressable
            onPress={goToday}
            disabled={onCurrentMonth}
            accessibilityRole="button"
            style={[
              styles.today,
              { borderColor: t.ruleHairline },
              onCurrentMonth && styles.disabled,
            ]}
          >
            <Text style={[styles.todayText, { color: t.brandGreen }]}>Today</Text>
          </Pressable>
          <Pressable
            onPress={() => moveMonth(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={[styles.arrow, { borderColor: t.ruleHairline }]}
          >
            <CaretLeft size={15} color={t.brandGreen} />
          </Pressable>
          <Pressable
            onPress={() => moveMonth(1)}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={[styles.arrow, { borderColor: t.ruleHairline }]}
          >
            <CaretRight size={15} color={t.brandGreen} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.calendar, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
        <View style={[styles.weekdays, { borderBottomColor: t.ruleHairline }]}>
          {WEEKDAYS.map((weekday) => (
            <Text key={weekday} style={[styles.weekday, { color: t.inkMuted }]}>
              {weekday.slice(0, 1)}
            </Text>
          ))}
        </View>
        <View style={styles.cells}>
          {cells.map((cell) => {
            const dayEvents = cell.outsideMonth ? [] : eventsOnDay(events, cell.dayKey);
            const selected = cell.dayKey === selectedDayKey;
            const today = cell.dayKey === todayKey;
            return (
              <Pressable
                key={`${cell.date.toISOString()}-${cell.outsideMonth}`}
                disabled={cell.outsideMonth}
                onPress={() => setSelectedDayKey(cell.dayKey)}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: cell.outsideMonth }}
                accessibilityLabel={`${cell.date.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                })}, ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`}
                style={[
                  styles.cell,
                  { borderColor: t.ruleHairline },
                  selected && { backgroundColor: alpha(t.surfaceAnchor, 0.1) },
                ]}
              >
                <View style={[styles.dayCircle, today && { backgroundColor: t.surfaceAnchor }]}>
                  <Text
                    style={[
                      styles.day,
                      { color: cell.outsideMonth ? t.inkFaint : today ? t.inkInverse : t.inkStrong },
                    ]}
                  >
                    {cell.date.getDate()}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {dayEvents.slice(0, DOT_LIMIT).map((event) => (
                    <View
                      key={event.id}
                      style={[
                        styles.dot,
                        { backgroundColor: event.status === 'past' ? t.inkFaint : t.brandAmber },
                      ]}
                    />
                  ))}
                  {dayEvents.length > DOT_LIMIT && (
                    <Text style={[styles.overflow, { color: t.inkMuted }]}>+{dayEvents.length - DOT_LIMIT}</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.daySection}>
        <Text style={[styles.dayHeading, { color: t.inkStrong }]}>Selected day</Text>
        {selectedEvents.length ? (
          <View style={[styles.dayList, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
            {selectedEvents.map((event, index) => (
              <Pressable
                key={event.id}
                onPress={() => onSelectEvent(event.id)}
                style={({ pressed }) => [
                  styles.eventRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                  pressed && { backgroundColor: alpha(t.surfaceSoft, 0.55) },
                ]}
              >
                <View style={[styles.eventDot, { backgroundColor: event.status === 'past' ? t.inkFaint : t.brandAmber }]} />
                <View style={styles.eventCopy}>
                  <Text style={[styles.eventTitle, { color: t.inkStrong }]} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventMeta, { color: t.inkMuted }]} numberOfLines={1}>
                    {event.timeLabel} · {event.location}
                  </Text>
                </View>
                <CaretRight size={15} color={t.brandGreen} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={[styles.noEvents, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
            <Text style={[styles.noEventsText, { color: t.inkMuted }]}>No events on this day.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  monthLine: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  month: { fontFamily: sans(600), fontSize: 19, letterSpacing: trackDisplay(19) },
  year: { fontFamily: mono(500), fontSize: 11 },
  controls: { flexDirection: 'row', gap: 6 },
  today: { minHeight: 32, justifyContent: 'center', borderWidth: 1, borderRadius: 7, paddingHorizontal: 10 },
  todayText: { fontFamily: sans(600), fontSize: 10.5 },
  arrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 7 },
  disabled: { opacity: 0.4 },
  calendar: { overflow: 'hidden', borderWidth: 1, borderRadius: 9 },
  weekdays: { flexDirection: 'row', borderBottomWidth: 1 },
  weekday: { width: '14.2857%', paddingVertical: 7, textAlign: 'center', fontFamily: mono(500), fontSize: 9 },
  cells: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', height: 55, alignItems: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingTop: 5 },
  dayCircle: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  day: { fontFamily: mono(500), fontSize: 10 },
  dots: { minHeight: 12, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  overflow: { fontFamily: mono(500), fontSize: 7 },
  daySection: { marginTop: 18 },
  dayHeading: { marginBottom: 9, fontFamily: sans(600), fontSize: 15, letterSpacing: trackDisplay(15) },
  dayList: { overflow: 'hidden', borderWidth: 1, borderRadius: 9 },
  eventRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 11 },
  eventDot: { width: 7, height: 7, borderRadius: 4 },
  eventCopy: { flex: 1, minWidth: 0 },
  eventTitle: { fontFamily: sans(600), fontSize: 13, lineHeight: 17 },
  eventMeta: { marginTop: 3, fontFamily: sans(400), fontSize: 11.5 },
  noEvents: { borderWidth: 1, borderRadius: 9, padding: 18, alignItems: 'center' },
  noEventsText: { fontFamily: sans(400), fontSize: 12.5 },
});
