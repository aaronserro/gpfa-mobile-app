import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, CalendarDots, CheckCircle, Megaphone } from '../ds/icons';
import { Badge, MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans, trackDisplay, wgRule } from '../ds/tokens';
import type { Group, Member, NewsStory } from '../api/types';
import type { EventRsvpState, MobileEventPreview } from './EventsScreen';

export interface HomeActionPreview {
  id: string;
  kind: 'annual-meeting' | 'survey' | 'announcement';
  title: string;
  description: string;
  actionLabel: string;
}

export interface HomeAnnualMeetingPreview {
  title: string;
  dateLabel: string;
  location: string;
  status: string;
}

export default function HomeScreen({
  member,
  actions,
  annualMeeting,
  events,
  groups,
  news,
  onOpenAction,
  onOpenAnnualMeeting,
  onOpenEvent,
  onGoEvents,
  onGoNews,
  onGoGroups,
  onPickGroup,
  onOpenNewsStory,
  showBadges,
}: {
  member: Member;
  actions: HomeActionPreview[];
  annualMeeting: HomeAnnualMeetingPreview | null;
  events: MobileEventPreview[];
  groups: Group[];
  /** Resource-backed News Radar stories shown on the dashboard. */
  news: NewsStory[];
  onOpenAction: (action: HomeActionPreview) => void;
  onOpenAnnualMeeting: () => void;
  onOpenEvent: (eventId: string) => void;
  onGoEvents: () => void;
  onGoNews: () => void;
  onGoGroups: () => void;
  onPickGroup: (groupId: string) => void;
  onOpenNewsStory: (story: NewsStory) => void;
  showBadges: boolean;
}) {
  const { t } = useTheme();

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Good morning, " accent={`${member.firstName}.`} />

      <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!!actions.length && (
          <View style={styles.firstSection}>
            <SectionHead label="For you" meta={`${actions.length} TO DO`} />
            <View style={[styles.actionCard, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
              {actions.slice(0, 3).map((action, index) => (
                <Pressable
                  key={action.id}
                  onPress={() => onOpenAction(action)}
                  style={({ pressed }) => [
                    styles.actionRow,
                    index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                    pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
                  ]}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.kind === 'survey' ? t.brandAmberSoft : t.brandGreenSoft }]}>
                    {action.kind === 'announcement' ? (
                      <Megaphone size={18} color={t.brandBlue} />
                    ) : action.kind === 'survey' ? (
                      <CheckCircle size={18} color={t.brandAmber} />
                    ) : (
                      <CalendarDots size={18} color={t.brandGreen} />
                    )}
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.actionTitle, { color: t.inkStrong }]} numberOfLines={2}>{action.title}</Text>
                    <Text style={[styles.actionDescription, { color: t.inkMuted }]} numberOfLines={1}>{action.description}</Text>
                  </View>
                  <Text style={[styles.actionLabel, { color: t.brandGreen }]}>{action.actionLabel}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!!annualMeeting && (
          <View style={styles.section}>
            <SectionHead label="Annual Meeting" />
            <Pressable
              onPress={onOpenAnnualMeeting}
              style={({ pressed }) => [
                styles.meetingCard,
                { backgroundColor: pressed ? t.surfaceAnchorSoft : t.surfaceAnchor },
              ]}
            >
              <MastheadMeta size={9.5} color={t.brandGreenOnDark}>{annualMeeting.status.toUpperCase()}</MastheadMeta>
              <Text style={styles.meetingTitle}>{annualMeeting.title}</Text>
              <Text style={[styles.meetingMeta, { color: alpha(t.inkInverse, 0.76) }]}>{annualMeeting.dateLabel} · {annualMeeting.location}</Text>
              <View style={styles.meetingAction}>
                <Text style={[styles.meetingActionText, { color: t.brandGreenOnDark }]}>View meeting</Text>
                <ArrowRight size={15} color={t.brandGreenOnDark} />
              </View>
            </Pressable>
          </View>
        )}

        {!!events.length && (
          <View style={styles.section}>
            <SectionHead label="Upcoming events" action="All events" onAction={onGoEvents} />
            <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
              {events.slice(0, 2).map((event, index) => (
                <Pressable
                  key={event.id}
                  onPress={() => onOpenEvent(event.id)}
                  style={({ pressed }) => [
                    styles.eventRow,
                    index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                    pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
                  ]}
                >
                  <View style={[styles.dateChip, { borderColor: t.ruleHairline, backgroundColor: t.surfaceSoft }]}>
                    <Text style={[styles.dateMonth, { color: t.inkMuted }]}>{event.month}</Text>
                    <Text style={[styles.dateNum, { color: t.inkStrong }]}>{event.day}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.eventTitle, { color: t.inkStrong }]} numberOfLines={2}>{event.title}</Text>
                    <Text style={[styles.eventMeta, { color: t.inkMuted }]} numberOfLines={1}>{event.location} · {event.format}</Text>
                    <Badge variant={event.rsvp === 'attending' ? 'tag-green' : 'tag-default'} size={9}>
                      {eventRsvpLabel(event.rsvp)}
                    </Badge>
                  </View>
                  <ArrowRight size={16} color={t.brandGreen} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!!groups.length && (
          <View style={styles.section}>
            <SectionHead label="My groups" action="All groups" onAction={onGoGroups} />
            <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
              {groups.map((g, i) => (
                <Pressable
                  key={g.id}
                  onPress={() => onPickGroup(g.id)}
                  style={({ pressed }) => [
                    styles.groupRow,
                    { borderLeftColor: wgRule(t, g.cls) },
                    i > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                    pressed && { backgroundColor: alpha(t.surfaceSoft, 0.45) },
                  ]}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.groupName, { color: t.inkStrong }]}>{g.n}</Text>
                    <Text style={[styles.groupMeta, { color: t.inkMuted }]} numberOfLines={1}>{g.threads[0]?.title ?? 'No posts yet'}</Text>
                  </View>
                  {showBadges && g.unread > 0 && <Badge variant="secondary">{g.unread}</Badge>}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!!news.length && (
          <View style={styles.section}>
            <SectionHead label="News Radar" action="All coverage" onAction={onGoNews} />
            <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
              {news.slice(0, 3).map((story, index) => (
                <Pressable
                  key={story.id}
                  onPress={() => onOpenNewsStory(story)}
                  style={({ pressed }) => [
                    styles.radarRow,
                    index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                    pressed && { backgroundColor: alpha(t.surfaceSoft, 0.45) },
                  ]}
                >
                  <View style={styles.flex}>
                    <View style={styles.radarMetaRow}>
                      <Text style={[styles.radarTopic, { color: t.brandAmber }]} numberOfLines={1}>{story.tag ?? story.topic}</Text>
                      <MastheadMeta size={10}>{story.meta}</MastheadMeta>
                    </View>
                    <Text style={[styles.radarTitle, { color: t.inkStrong }]} numberOfLines={2}>{story.title}</Text>
                  </View>
                  <ArrowRight size={16} color={t.brandGreen} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHead({
  label,
  meta,
  action,
  onAction,
}: {
  label: string;
  meta?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { t } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.h3, { color: t.inkStrong }]}>{label}</Text>
      {!!meta && <MastheadMeta size={9.5}>{meta}</MastheadMeta>}
      {!!action && !!onAction && (
        <Pressable onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: t.brandGreen }]}>{action}</Text>
          <ArrowRight size={13} color={t.brandGreen} />
        </Pressable>
      )}
    </View>
  );
}

function eventRsvpLabel(state: EventRsvpState) {
  if (state === 'attending') return 'Attending';
  if (state === 'not-attending') return 'Not attending';
  return 'Not responded';
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingBottom: 32 },
  firstSection: { paddingTop: 22 },
  section: { paddingTop: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 30,
  },
  sectionActionText: {
    fontFamily: sans(500),
    fontSize: 12.5,
  },
  h3: {
    fontFamily: sans(600),
    fontSize: 16,
    letterSpacing: trackDisplay(16),
  },
  band: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  actionCard: { marginHorizontal: 20, borderWidth: 1, borderRadius: 9, overflow: 'hidden' },
  actionRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 11 },
  actionIcon: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: sans(600), fontSize: 13, lineHeight: 18 },
  actionDescription: { marginTop: 2, fontFamily: sans(400), fontSize: 11.5 },
  actionLabel: { fontFamily: sans(600), fontSize: 11.5 },
  meetingCard: { marginHorizontal: 20, borderRadius: 10, padding: 18 },
  meetingTitle: { marginTop: 7, fontFamily: sans(600), fontSize: 20, lineHeight: 24, letterSpacing: trackDisplay(20), color: '#fff' },
  meetingMeta: { marginTop: 6, fontFamily: sans(400), fontSize: 12.5 },
  meetingAction: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  meetingActionText: { fontFamily: sans(600), fontSize: 12.5 },
  eventRow: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 13 },
  radarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  radarMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 3,
  },
  radarTopic: {
    maxWidth: 124,
    fontFamily: sans(600),
    fontSize: 10.5,
  },
  radarTitle: {
    fontFamily: sans(500),
    fontSize: 13,
    lineHeight: 18,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    paddingRight: 20,
    paddingLeft: 17,
    borderLeftWidth: 3,
  },
  groupName: {
    fontFamily: sans(600),
    fontSize: 14,
  },
  groupMeta: {
    marginTop: 2,
    fontFamily: sans(400),
    fontSize: 12,
  },
  dateChip: {
    width: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  dateMonth: {
    fontFamily: sans(500),
    fontSize: 11,
  },
  dateNum: {
    fontFamily: sans(600),
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: trackDisplay(22),
  },
  eventTitle: {
    fontFamily: sans(600),
    fontSize: 13.5,
    lineHeight: 18,
  },
  eventMeta: {
    marginTop: 2,
    fontFamily: sans(400),
    fontSize: 12,
  },
});
