import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, LiveDot, MastheadMeta, RelevanceDot, ScreenHeader } from '../ds/primitives';
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
  showBadges,
}: {
  member: Member;
  event: CalendarEvent | null;
  groups: Group[];
  /** The whole radar; the digest shows the industry coverage from it. */
  news: NewsStory[];
  onGoNews: () => void;
  onGoGroups: () => void;
  onPickGroup: (groupId: string) => void;
  showBadges: boolean;
}) {
  const { t } = useTheme();

  // GPFA's own material has its own place on the News screen; the digest here
  // is the industry read.
  const digest = news.filter((n) => n.kind === 'radar');

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Good morning, " accent={`${member.firstName}.`} />

      <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          <LiveDot />
          <Text style={[styles.h3, { color: t.inkStrong }]}>News Radar</Text>
        </View>
        <Pressable onPress={onGoNews} hitSlop={8}>
          <Text style={[styles.link, { color: t.brandGreen }]}>All coverage →</Text>
        </Pressable>
      </View>

      <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
        {digest.map((n, i) => (
          <View key={n.id} style={[styles.newsRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline }]}>
            <RelevanceDot level={n.rel ?? 'low'} style={styles.newsDot} />
            <View style={styles.newsBody}>
              <Text style={[styles.newsTitle, { color: t.inkStrong }]}>{n.title}</Text>
              <View style={styles.newsMetaRow}>
                <Badge variant="tag-green" size={9.5} style={styles.newsTag}>
                  {n.tag ?? n.topic}
                </Badge>
                <MastheadMeta size={10}>{n.meta}</MastheadMeta>
              </View>
            </View>
          </View>
        ))}
      </View>

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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  newsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  newsDot: { marginTop: 6 },
  newsBody: { flex: 1 },
  newsTitle: {
    fontFamily: sans(500),
    fontSize: 13.5,
    lineHeight: 19.6,
  },
  newsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  newsTag: { height: 17 },
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
