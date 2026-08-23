import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from '../ds/icons';
import { Badge, Card, MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans, trackDisplay, wgRule } from '../ds/tokens';
import type { CalendarEvent, Group, Member, NewsStory } from '../api/types';

export default function HomeScreen({
  member,
  event,
  groups,
  news,
  onGoNews,
  onGoGroups,
  onPickGroup,
  onOpenNewsStory,
  showBadges,
}: {
  member: Member;
  event: CalendarEvent | null;
  groups: Group[];
  /** Resource-backed News Radar stories shown on the dashboard. */
  news: NewsStory[];
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
      {news.length > 0 && (
        <View style={styles.radarSection}>
          <View style={styles.radarHead}>
            <Text style={[styles.h3, { color: t.inkStrong }]}>News Radar</Text>
            <Pressable
              onPress={onGoNews}
              style={({ pressed }) => [
                styles.sectionAction,
                pressed && { backgroundColor: alpha(t.surfaceSoft, 0.45) },
              ]}
            >
              <Text style={[styles.sectionActionText, { color: t.brandGreen }]}>All coverage</Text>
              <ArrowRight size={14} color={t.brandGreen} />
            </Pressable>
          </View>

          <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}> 
            {news.slice(0, 4).map((story, index) => (
              <Pressable
                key={story.id}
                onPress={() => onOpenNewsStory(story)}
                style={({ pressed }) => [
                  styles.radarRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
                  pressed && { backgroundColor: alpha(t.surfaceSoft, 0.45) },
                ]}
              >
                <View style={styles.radarBody}>
                  <View style={styles.radarMetaRow}>
                    <Text style={[styles.radarTopic, { color: t.brandAmber }]} numberOfLines={1}>
                      {story.tag ?? story.topic}
                    </Text>
                    <MastheadMeta size={10}>{story.meta}</MastheadMeta>
                  </View>
                  <Text style={[styles.radarTitle, { color: t.inkStrong }]} numberOfLines={2}>
                    {story.title}
                  </Text>
                  <Text style={[styles.radarSummary, { color: t.inkMuted }]} numberOfLines={1}>
                    {story.body}
                  </Text>
                </View>
                <ArrowRight size={16} color={t.brandGreen} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.sectionHead}>
        <Text style={[styles.h3, { color: t.inkStrong }]}>My groups</Text>
        <Pressable onPress={onGoGroups} hitSlop={8}>
          <Text style={[styles.link, { color: t.brandGreen }]}>All groups →</Text>
        </Pressable>
      </View>

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
            <View style={styles.groupBody}>
              <Text style={[styles.groupName, { color: t.inkStrong }]}>{g.n}</Text>
              <Text style={[styles.groupMeta, { color: t.inkMuted }]} numberOfLines={1}>
                {g.threads[0]?.title ?? 'No posts yet'}
              </Text>
            </View>
            {showBadges && g.unread > 0 && <Badge variant="secondary">{g.unread}</Badge>}
          </Pressable>
        ))}
      </View>

      {!!event && (
        <View style={styles.calendar}>
          <Text style={[styles.h3, styles.calendarHead, { color: t.inkStrong }]}>Next on the calendar</Text>
          <Card style={styles.eventCard}>
            <View style={[styles.dateChip, { borderColor: t.ruleHairline, backgroundColor: t.surfaceSoft }]}>
              <Text style={[styles.dateMonth, { color: t.inkMuted }]}>{event.month}</Text>
              <Text style={[styles.dateNum, { color: t.inkStrong }]}>{event.day}</Text>
            </View>
            <View style={styles.eventBody}>
              <Text style={[styles.eventTitle, { color: t.inkStrong }]}>{event.title}</Text>
              <Text style={[styles.eventMeta, { color: t.inkMuted }]}>{event.meta}</Text>
              {!!event.tags.length && (
                <View style={styles.eventTags}>
                  {event.tags.map((tag) => (
                    <Badge key={tag.label} variant={tag.tone === 'green' ? 'tag-green' : 'tag-default'} size={9.5}>
                      {tag.label}
                    </Badge>
                  ))}
                </View>
              )}
            </View>
          </Card>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 8 },
  radarSection: {
    paddingTop: 22,
  },
  radarHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 10,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
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
  link: {
    fontFamily: sans(400),
    fontSize: 12.5,
  },
  band: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  radarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  radarBody: { flex: 1 },
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
  radarSummary: {
    marginTop: 3,
    fontFamily: sans(400),
    fontSize: 12,
    lineHeight: 16,
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
  groupBody: { flex: 1 },
  groupName: {
    fontFamily: sans(600),
    fontSize: 14,
  },
  groupMeta: {
    marginTop: 2,
    fontFamily: sans(400),
    fontSize: 12,
  },
  calendar: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  calendarHead: { marginBottom: 10 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  eventBody: { flex: 1 },
  eventTitle: {
    fontFamily: sans(600),
    fontSize: 14,
  },
  eventMeta: {
    marginTop: 2,
    fontFamily: sans(400),
    fontSize: 12,
  },
  eventTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 7,
  },
});
