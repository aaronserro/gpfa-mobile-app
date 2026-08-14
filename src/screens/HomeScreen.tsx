import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Moon, Sun } from '../ds/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Card, DisplayHead, Eyebrow, LiveDot, MastheadMeta, RadialWash, RelevanceDot } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans, topPad, trackDisplay, wgRule } from '../ds/tokens';
import { GROUPS, NEWS } from '../data/portal';

import bannerLogo from '../../assets/banner-logo-white.png';

export default function HomeScreen({
  onGoAsk,
  onGoGroups,
  onPickGroup,
  showBadges,
}: {
  onGoAsk: () => void;
  onGoGroups: () => void;
  onPickGroup: (index: number) => void;
  showBadges: boolean;
}) {
  const { t, isDark, toggle } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.masthead, { backgroundColor: t.surfaceAnchor, paddingTop: topPad(insets.top, 72) }]}>
        <RadialWash washes={[{ color: t.brandBlue, o: 0.14, cx: '0.88', cy: '0', rx: '1.2', ry: '1.3', stop: '0.55' }]} />
        <View style={styles.mastheadRow}>
          <Image source={bannerLogo} style={styles.logo} resizeMode="contain" />
          <Pressable
            onPress={toggle}
            accessibilityLabel="Toggle dark mode"
            style={[styles.iconBtn, { borderColor: t.ruleOnAnchor }]}
          >
            {isDark ? <Sun size={18} color="#fff" /> : <Moon size={18} color="#fff" />}
          </Pressable>
        </View>
        <DisplayHead size={26} onAnchor em="Robert." style={styles.greeting}>
          Good morning,{' '}
        </DisplayHead>
      </View>

      <View style={styles.sectionHead}>
        <View style={styles.sectionTitleRow}>
          <LiveDot />
          <Text style={[styles.h3, { color: t.inkStrong }]}>News Radar</Text>
        </View>
        <Pressable onPress={onGoAsk} hitSlop={8}>
          <Text style={[styles.link, { color: t.brandGreen }]}>All coverage →</Text>
        </Pressable>
      </View>

      <View style={[styles.band, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
        {NEWS.map((n, i) => (
          <View key={n.t} style={[styles.newsRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline }]}>
            <RelevanceDot level={n.rel} style={styles.newsDot} />
            <View style={styles.newsBody}>
              <Text style={[styles.newsTitle, { color: t.inkStrong }]}>{n.t}</Text>
              <View style={styles.newsMetaRow}>
                <Badge variant="tag-green" size={9.5} style={styles.newsTag}>
                  {n.tag}
                </Badge>
                <MastheadMeta size={10}>{n.src}</MastheadMeta>
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
        {GROUPS.map((g, i) => (
          <Pressable
            key={g.id}
            onPress={() => onPickGroup(i)}
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
                {g.threads[0].title}
              </Text>
            </View>
            {showBadges && <Badge variant="secondary">{g.unread}</Badge>}
          </Pressable>
        ))}
      </View>

      <View style={styles.calendar}>
        <Text style={[styles.h3, styles.calendarHead, { color: t.inkStrong }]}>Next on the calendar</Text>
        <Card style={styles.eventCard}>
          <View style={[styles.dateChip, { borderColor: t.ruleHairline, backgroundColor: t.surfaceSoft }]}>
            <Eyebrow size={9}>Sep</Eyebrow>
            <Text style={[styles.dateNum, { color: t.inkStrong }]}>17</Text>
          </View>
          <View style={styles.eventBody}>
            <Text style={[styles.eventTitle, { color: t.inkStrong }]}>GPFA Annual Meeting 2026</Text>
            <Text style={[styles.eventMeta, { color: t.inkMuted }]}>Toronto, Canada · registration open</Text>
            <View style={styles.eventTags}>
              <Badge variant="tag-green" size={9.5}>
                Registered
              </Badge>
              <Badge variant="tag-default" size={9.5}>
                Conference
              </Badge>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 8 },
  masthead: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  mastheadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  logo: { width: 112, height: 30 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { marginTop: 18 },
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
