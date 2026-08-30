import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ArrowRight, CalendarDots, CheckCircle, DownloadSimple, MapPin } from '../ds/icons';
import { Badge, MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';
import type { EventRsvpState, MobileEventPreview } from '../api/types';
import { EventAttendees } from '../components/EventAttendees';
import { EventMonthCalendar } from '../components/EventMonthCalendar';

export type EventListFilter = 'upcoming' | 'rsvps' | 'past';
type EventViewMode = 'list' | 'calendar';

export default function EventsScreen({
  events,
  initialEventId = null,
  onBack,
  onRsvp,
  onAddToCalendar,
  onDownloadIcs,
}: {
  events: MobileEventPreview[];
  initialEventId?: string | null;
  onBack?: () => void;
  onRsvp: (eventId: string, state: EventRsvpState) => void | Promise<void>;
  onAddToCalendar: (event: MobileEventPreview) => void | Promise<void>;
  onDownloadIcs: (event: MobileEventPreview) => void | Promise<void>;
}) {
  const { t } = useTheme();
  const [filter, setFilter] = useState<EventListFilter>('upcoming');
  const [viewMode, setViewMode] = useState<EventViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(initialEventId);
  const selected = events.find((event) => event.id === selectedId) ?? null;

  const visible = useMemo(() => {
    if (filter === 'past') return events.filter((event) => event.status === 'past');
    if (filter === 'rsvps') {
      return events.filter((event) => event.status === 'upcoming' && event.rsvp === 'attending');
    }
    return events.filter((event) => event.status === 'upcoming');
  }, [events, filter]);

  if (selected) {
    return (
      <EventDetail
        event={selected}
        onBack={() => setSelectedId(null)}
        onRsvp={(state) => onRsvp(selected.id, state)}
        onAddToCalendar={() => onAddToCalendar(selected)}
        onDownloadIcs={() => onDownloadIcs(selected)}
      />
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="Events" onBack={onBack} backLabel="Back to More">
        <View style={[styles.viewSegment, { borderColor: t.ruleHairline }]}>
          {(['list', 'calendar'] as EventViewMode[]).map((mode) => {
            const active = viewMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setViewMode(mode)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.viewButton, active && { backgroundColor: t.surfacePaper }]}
              >
                <Text style={[styles.viewLabel, { color: active ? t.inkStrong : t.inkMuted }]}>
                  {mode === 'list' ? 'List' : 'Calendar'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {viewMode === 'list' && (
          <View style={[styles.segment, { backgroundColor: t.surfaceSoft }]}>
            {(
              [
                ['upcoming', 'Upcoming'],
                ['rsvps', 'My RSVPs'],
                ['past', 'Past'],
              ] as [EventListFilter, string][]
            ).map(([id, label]) => {
              const active = filter === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setFilter(id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.segmentButton, active && { backgroundColor: t.surfacePaper }]}
                >
                  <Text style={[styles.segmentLabel, { color: active ? t.inkStrong : t.inkMuted }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScreenHeader>

      {viewMode === 'calendar' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <EventMonthCalendar events={events} onSelectEvent={setSelectedId} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.introRow}>
            <View>
              <Text style={[styles.introTitle, { color: t.inkStrong }]}>Member calendar</Text>
              <Text style={[styles.introCopy, { color: t.inkMuted }]}>Briefings, meetings and peer sessions.</Text>
            </View>
            <MastheadMeta size={10}>{`${visible.length} EVENT${visible.length === 1 ? '' : 'S'}`}</MastheadMeta>
          </View>

          {visible.length ? (
            <View style={[styles.eventBand, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
              {visible.map((event, index) => (
                <Pressable
                  key={event.id}
                  onPress={() => setSelectedId(event.id)}
                  style={({ pressed }) => [
                    styles.eventRow,
                    index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                    pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
                  ]}
                >
                  <DateBlock month={event.month} day={event.day} />
                  <View style={styles.eventBody}>
                    <View style={styles.metaLine}>
                      <Text style={[styles.eventType, { color: t.brandAmber }]}>{event.type}</Text>
                      <MastheadMeta size={9.5}>{event.timeLabel}</MastheadMeta>
                    </View>
                    <Text style={[styles.eventTitle, { color: t.inkStrong }]} numberOfLines={2}>{event.title}</Text>
                    <Text style={[styles.eventLocation, { color: t.inkMuted }]} numberOfLines={1}>
                      {event.location} · {event.format}
                    </Text>
                    <View style={styles.badgeRow}>
                      <Badge variant={event.rsvp === 'attending' ? 'tag-green' : 'tag-default'} size={9}>
                        {rsvpLabel(event.rsvp)}
                      </Badge>
                      {event.registrationOpen && <Badge variant="tag-default" size={9}>Registration open</Badge>}
                    </View>
                  </View>
                  <ArrowRight size={16} color={t.brandGreen} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={[styles.empty, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
              <CalendarDots size={28} color={t.inkFaint} />
              <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>No events here yet</Text>
              <Text style={[styles.emptyCopy, { color: t.inkMuted }]}>Try another view to browse the member calendar.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function EventDetail({
  event,
  onBack,
  onRsvp,
  onAddToCalendar,
  onDownloadIcs,
}: {
  event: MobileEventPreview;
  onBack: () => void;
  onRsvp: (state: EventRsvpState) => void;
  onAddToCalendar: () => void | Promise<void>;
  onDownloadIcs: () => void | Promise<void>;
}) {
  const { t } = useTheme();

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="Event details" onBack={onBack} backLabel="Back to events" />
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.detailLead}>
          <View style={styles.metaLine}>
            <Text style={[styles.eventType, { color: t.brandAmber }]}>{event.type}</Text>
            <MastheadMeta size={10}>{event.dateLabel.toUpperCase()}</MastheadMeta>
          </View>
          <Text style={[styles.detailTitle, { color: t.inkStrong }]}>{event.title}</Text>
          <Text style={[styles.detailSummary, { color: t.inkBody }]}>{event.summary}</Text>
        </View>

        <View style={[styles.factCard, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          <Fact icon="calendar" label={event.dateLabel} detail={event.timeLabel} />
          <Fact icon="pin" label={event.location} detail={event.format} divided />
        </View>

        <SectionHeading label="Attendance" />
        <View style={[styles.attendeeCard, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          <EventAttendees count={event.attendeeCount} attendees={event.attendees} />
        </View>

        <SectionHeading label="Agenda" />
        <View style={[styles.agendaCard, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          {event.agenda.map((item, index) => (
            <View key={`${item.time}-${item.title}`} style={[styles.agendaRow, index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline }]}>
              <Text style={[styles.agendaTime, { color: t.brandGreen }]}>{item.time}</Text>
              <View style={styles.eventBody}>
                <Text style={[styles.agendaTitle, { color: t.inkStrong }]}>{item.title}</Text>
                {!!item.detail && <Text style={[styles.agendaDetail, { color: t.inkMuted }]}>{item.detail}</Text>}
              </View>
            </View>
          ))}
        </View>

        {!!event.joinUrl && (
          <Pressable
            onPress={() => void Linking.openURL(event.joinUrl!)}
            style={[styles.secondaryAction, { borderColor: t.ruleStrong }]}
          >
            <Text style={[styles.secondaryActionText, { color: t.brandGreen }]}>Open meeting link</Text>
            <ArrowRight size={16} color={t.brandGreen} />
          </Pressable>
        )}

        <View style={styles.calendarActions}>
          <Pressable
            onPress={() => void onAddToCalendar()}
            style={[styles.secondaryAction, styles.calendarAction, { borderColor: t.ruleStrong }]}
          >
            <CalendarDots size={17} color={t.brandGreen} />
            <Text style={[styles.secondaryActionText, { color: t.brandGreen }]}>Add to calendar</Text>
          </Pressable>
          <Pressable
            onPress={() => void onDownloadIcs()}
            style={[styles.secondaryAction, styles.calendarAction, { borderColor: t.ruleStrong }]}
          >
            <DownloadSimple size={17} color={t.brandGreen} />
            <Text style={[styles.secondaryActionText, { color: t.brandGreen }]}>Download .ics</Text>
          </Pressable>
        </View>
      </ScrollView>

      {event.status === 'upcoming' && event.registrationOpen && (
        <View style={[styles.actionBar, { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline }]}>
          <View style={styles.eventBody}>
            <Text style={[styles.actionTitle, { color: t.inkStrong }]}>Your RSVP</Text>
            <Text style={[styles.actionMeta, { color: t.inkMuted }]}>{rsvpLabel(event.rsvp)}</Text>
          </View>
          <Pressable
            onPress={() => onRsvp(event.rsvp === 'attending' ? 'not-attending' : 'attending')}
            style={[styles.primaryAction, { backgroundColor: event.rsvp === 'attending' ? t.surfaceSoft : t.surfaceAnchor }]}
          >
            <CheckCircle size={17} color={event.rsvp === 'attending' ? t.brandGreen : t.inkInverse} />
            <Text style={[styles.primaryActionText, { color: event.rsvp === 'attending' ? t.brandGreen : t.inkInverse }]}>
              {event.rsvp === 'attending' ? 'Change RSVP' : 'Attend'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function DateBlock({ month, day }: { month: string; day: string }) {
  const { t } = useTheme();
  return (
    <View style={[styles.dateBlock, { backgroundColor: t.surfaceSoft, borderColor: t.ruleHairline }]}>
      <Text style={[styles.dateMonth, { color: t.inkMuted }]}>{month.toUpperCase()}</Text>
      <Text style={[styles.dateDay, { color: t.inkStrong }]}>{day}</Text>
    </View>
  );
}

function Fact({
  icon,
  label,
  detail,
  divided = false,
}: {
  icon: 'calendar' | 'pin';
  label: string;
  detail: string;
  divided?: boolean;
}) {
  const { t } = useTheme();
  const Icon = icon === 'calendar' ? CalendarDots : MapPin;
  return (
    <View style={[styles.factRow, divided && { borderTopWidth: 1, borderTopColor: t.ruleHairline }]}>
      <Icon size={19} color={t.brandGreen} />
      <View style={styles.eventBody}>
        <Text style={[styles.factLabel, { color: t.inkStrong }]}>{label}</Text>
        <Text style={[styles.factDetail, { color: t.inkMuted }]}>{detail}</Text>
      </View>
    </View>
  );
}

function SectionHeading({ label }: { label: string }) {
  const { t } = useTheme();
  return <Text style={[styles.sectionHeading, { color: t.inkStrong }]}>{label}</Text>;
}

function rsvpLabel(state: EventRsvpState) {
  if (state === 'attending') return 'Attending';
  if (state === 'not-attending') return 'Not attending';
  return 'Not responded';
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  viewSegment: { flexDirection: 'row', gap: 3, marginBottom: 8, padding: 3, borderWidth: 1, borderRadius: 9 },
  viewButton: { flex: 1, minHeight: 31, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  viewLabel: { fontFamily: sans(600), fontSize: 11.5 },
  segment: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 9 },
  segmentButton: { flex: 1, minHeight: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { fontFamily: sans(600), fontSize: 11.5 },
  list: { paddingVertical: 22, paddingBottom: 30 },
  introRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingHorizontal: 20, marginBottom: 12 },
  introTitle: { fontFamily: sans(600), fontSize: 17, letterSpacing: trackDisplay(17) },
  introCopy: { marginTop: 3, fontFamily: sans(400), fontSize: 12.5 },
  eventBand: { borderTopWidth: 1, borderBottomWidth: 1 },
  eventRow: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 20, paddingVertical: 15 },
  dateBlock: { width: 50, borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  dateMonth: { fontFamily: mono(500), fontSize: 9.5, letterSpacing: 0.5 },
  dateDay: { marginTop: 1, fontFamily: sans(600), fontSize: 21, lineHeight: 24 },
  eventBody: { flex: 1, minWidth: 0 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eventType: { fontFamily: sans(600), fontSize: 10.5 },
  eventTitle: { fontFamily: sans(600), fontSize: 14, lineHeight: 19 },
  eventLocation: { marginTop: 3, fontFamily: sans(400), fontSize: 12, lineHeight: 17 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  empty: { marginHorizontal: 20, borderWidth: 1, borderRadius: 9, alignItems: 'center', padding: 28 },
  emptyTitle: { marginTop: 10, fontFamily: sans(600), fontSize: 15 },
  emptyCopy: { marginTop: 4, textAlign: 'center', fontFamily: sans(400), fontSize: 12.5, lineHeight: 18 },
  detailScroll: { padding: 20, paddingBottom: 120 },
  detailLead: { marginBottom: 22 },
  detailTitle: { fontFamily: sans(600), fontSize: 25, lineHeight: 30, letterSpacing: trackDisplay(25) },
  detailSummary: { marginTop: 12, fontFamily: sans(400), fontSize: 14, lineHeight: 22 },
  factCard: { borderWidth: 1, borderRadius: 9 },
  factRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 },
  factLabel: { fontFamily: sans(600), fontSize: 13.5 },
  factDetail: { marginTop: 2, fontFamily: sans(400), fontSize: 12 },
  attendeeCard: { borderWidth: 1, borderRadius: 9, padding: 14 },
  sectionHeading: { marginTop: 24, marginBottom: 10, fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  agendaCard: { borderWidth: 1, borderRadius: 9 },
  agendaRow: { flexDirection: 'row', gap: 14, padding: 14 },
  agendaTime: { width: 62, fontFamily: mono(600), fontSize: 10.5 },
  agendaTitle: { fontFamily: sans(600), fontSize: 13.5, lineHeight: 18 },
  agendaDetail: { marginTop: 3, fontFamily: sans(400), fontSize: 12, lineHeight: 17 },
  secondaryAction: { marginTop: 18, minHeight: 46, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryActionText: { fontFamily: sans(600), fontSize: 13 },
  calendarActions: { flexDirection: 'row', gap: 10 },
  calendarAction: { flex: 1, paddingHorizontal: 8 },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionTitle: { fontFamily: sans(600), fontSize: 13 },
  actionMeta: { marginTop: 2, fontFamily: sans(400), fontSize: 11.5 },
  primaryAction: { minHeight: 44, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16 },
  primaryActionText: { fontFamily: sans(600), fontSize: 13 },
});
