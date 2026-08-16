/**
 * News Radar — all coverage.
 *
 * From the "GPFA News Screen" design doc. That doc previews two views behind a
 * `startView` prop; the News one is what's built here, since Home already
 * exists as `HomeScreen`. Reached from Home's "All coverage →" and from the
 * Resources hub's News card; the caret goes back to whichever opened it, so
 * `App.tsx` tracks the two separately. It is a branch, not a tab of its own.
 *
 * Filter state (topic, source) is view state, so it lives here rather than in
 * App.tsx, the same way the job board's filters live in `ResourcesScreen`.
 */
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ArrowRight, ArrowSquareOut, LockSimple, Tray } from '../ds/icons';
import { MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';
import type { NewsStory } from '../api/types';

/** The topic filter's "no filter" entry. Not a topic any story carries. */
const ALL_TOPICS = 'All topics';

type SourceId = 'all' | 'gpfa' | 'industry';

const SOURCES: { id: SourceId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'gpfa', label: 'GPFA' },
  { id: 'industry', label: 'Industry' },
];

export default function NewsScreen({
  stories,
  onBack,
  onOpen,
}: {
  stories: NewsStory[];
  onBack: () => void;
  /** Opens the story — its source for radar coverage, its material for GPFA's. */
  onOpen: (story: NewsStory) => void;
}) {
  const { t } = useTheme();

  const [topic, setTopic] = useState<string>(ALL_TOPICS);
  const [source, setSource] = useState<SourceId>('all');

  const filtered = useMemo(
    () =>
      stories.filter((s) => {
        if (source === 'gpfa' && s.kind !== 'gpfa') return false;
        if (source === 'industry' && s.kind !== 'radar') return false;
        if (topic !== ALL_TOPICS && s.topic !== topic) return false;
        return true;
      }),
    [stories, source, topic]
  );

  // Counts are over the whole list, not the current source — the design keeps
  // them fixed so the chips don't renumber as you switch sources.
  const topicOptions = useMemo(() => {
    const names = Array.from(new Set(stories.map((s) => s.topic))).sort((a, b) =>
      a.localeCompare(b)
    );
    return [{ value: ALL_TOPICS, count: stories.length }].concat(
      names.map((n) => ({ value: n, count: stories.filter((s) => s.topic === n).length }))
    );
  }, [stories]);

  const filtering = topic !== ALL_TOPICS || source !== 'all';
  const noun = filtered.length === 1 ? 'STORY' : 'STORIES';
  const resultCount = filtering
    ? `${filtered.length} OF ${stories.length} ${noun}`
    : `${stories.length} ${stories.length === 1 ? 'STORY' : 'STORIES'}`;

  const clearFilters = () => {
    setTopic(ALL_TOPICS);
    setSource('all');
  };

  return (
    <View style={styles.fill}>
      <ScreenHeader title="News Radar" onBack={onBack} backLabel="Back to home" />

      <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.controlRow}>
        <MastheadMeta size={10.5} style={styles.countTrack}>
          {resultCount}
        </MastheadMeta>
        <View style={[styles.segment, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
          {SOURCES.map((s) => {
            const on = s.id === source;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSource(s.id)}
                style={({ pressed }) => [
                  styles.segmentBtn,
                  on
                    ? { backgroundColor: t.surfaceAnchor }
                    : pressed && { backgroundColor: alpha(t.surfaceSoft, 0.45) },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { fontFamily: sans(on ? 600 : 400), color: on ? t.inkInverse : t.inkMuted },
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topicRow}
      >
        {topicOptions.map((o) => {
          const on = o.value === topic;
          return (
            <Pressable
              key={o.value}
              onPress={() => setTopic(o.value)}
              style={[
                styles.topicChip,
                {
                  borderColor: on ? t.surfaceAnchor : t.ruleHairline,
                  backgroundColor: on ? t.surfaceAnchor : t.surfacePaper,
                },
              ]}
            >
              <Text
                style={[
                  styles.topicLabel,
                  { fontFamily: sans(on ? 600 : 400), color: on ? t.inkInverse : t.inkMuted },
                ]}
              >
                {o.value}
              </Text>
              <Text
                style={[
                  styles.topicCount,
                  {
                    color: on ? t.inkInverse : t.inkMuted,
                    backgroundColor: on ? alpha(t.inkInverse, 0.2) : t.surfaceSoft,
                  },
                ]}
              >
                {o.count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {filtered.map((s) => (
          <StoryCard key={s.id} story={s} onOpen={() => onOpen(s)} />
        ))}

        {filtered.length === 0 && (
          <View style={[styles.empty, { borderColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
            <Tray size={22} color={t.inkFaint} />
            <Text style={[styles.emptyTitle, { color: t.inkStrong }]}>
              No stories match these filters
            </Text>
            <Text style={[styles.emptyBody, { color: t.inkMuted }]}>
              Clear the filters to bring more stories back into view.
            </Text>
            <Pressable
              onPress={clearFilters}
              style={({ pressed }) => [
                styles.clearBtn,
                { backgroundColor: t.surfaceAnchor, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              {/* On the anchor fill in both themes, so a literal is the token. */}
              <Text style={styles.clearText}>Clear filters</Text>
            </Pressable>
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

/**
 * One story. The two kinds share a shell and diverge in the trimmings: radar
 * coverage carries a ticker and a thread count, GPFA material carries a GPFA
 * badge, topic tags, and a lock when it is members-only.
 */
function StoryCard({ story, onOpen }: { story: NewsStory; onOpen: () => void }) {
  const { t } = useTheme();
  const isGpfa = story.kind === 'gpfa';
  // Members-only GPFA material has nowhere to send an unentitled reader.
  const hasAction = !isGpfa || !story.memberOnly;
  const threads = story.threads ?? 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.surfacePaper,
          borderColor: isGpfa ? alpha(t.surfaceAnchor, 0.4) : t.ruleHairline,
        },
      ]}
    >
      <Pressable onPress={hasAction ? onOpen : undefined} disabled={!hasAction}>
        <View style={[styles.hero, { backgroundColor: t.surfaceSoft, borderBottomColor: t.ruleHairline }]}>
          {!!story.imageUrl && (
            <Image
              source={{ uri: story.imageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          )}
          {/* The design's white scrim; taken from the paper token so it also
              reads on the dark theme's near-black card. */}
          <LinearGradient
            colors={[alpha(t.surfacePaper, 0), alpha(t.surfacePaper, 0.82)]}
            style={styles.scrim}
            pointerEvents="none"
          />
          <View style={styles.heroRow}>
            <Text
              style={[
                styles.heroChip,
                {
                  color: t.inkStrong,
                  borderColor: t.ruleHairline,
                  backgroundColor: alpha(t.surfacePaper, 0.9),
                },
              ]}
            >
              {isGpfa ? (story.chip ?? story.topic) : story.topic}
            </Text>
            {isGpfa && (
              <Text style={[styles.gpfaChip, { backgroundColor: t.surfaceAnchor }]}>GPFA</Text>
            )}
          </View>
        </View>

        <View style={styles.cardHead}>
          {!isGpfa && !!story.ticker && (
            <Text style={[styles.pill, { color: t.inkMuted, borderColor: t.ruleHairline }]}>
              {story.ticker}
            </Text>
          )}
          {isGpfa && story.memberOnly && (
            <View style={[styles.lockPill, { borderColor: t.ruleHairline }]}>
              <LockSimple size={11} color={t.inkMuted} />
              <Text style={[styles.lockText, { color: t.inkMuted }]}>Members only</Text>
            </View>
          )}

          <Text style={[styles.title, { color: t.inkStrong }]} numberOfLines={3}>
            {story.title}
          </Text>
          <MastheadMeta size={10} style={styles.meta}>
            {story.meta}
          </MastheadMeta>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.body, { color: t.inkMuted }]} numberOfLines={isGpfa ? 4 : 3}>
            {story.body}
          </Text>

          {isGpfa && !!story.topics?.length && (
            <View style={styles.tags}>
              {story.topics.map((tag) => (
                <Text
                  key={tag}
                  style={[
                    styles.tag,
                    {
                      color: t.inkStrong,
                      borderColor: alpha(t.surfaceAnchor, 0.3),
                      backgroundColor: alpha(t.surfaceAnchor, 0.1),
                    },
                  ]}
                >
                  {tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Pressable>

      <View style={[styles.foot, { borderTopColor: alpha(t.ruleHairline, 0.6) }]}>
        <MastheadMeta size={10} color={isGpfa ? t.brandGreen : t.inkMuted} style={styles.footTrack}>
          {isGpfa ? 'FROM GPFA' : `${threads} ${threads === 1 ? 'THREAD' : 'THREADS'}`}
        </MastheadMeta>
        {hasAction && (
          <Pressable
            onPress={onOpen}
            style={({ pressed }) => [
              styles.action,
              pressed && { backgroundColor: alpha(t.surfaceSoft, 0.45) },
            ]}
          >
            <Text style={[styles.actionText, { color: t.brandGreen }]}>
              {isGpfa ? 'Read' : 'Open'}
            </Text>
            {isGpfa ? (
              <ArrowRight size={14} color={t.brandGreen} />
            ) : (
              <ArrowSquareOut size={14} color={t.brandGreen} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingBottom: 24 },

  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  countTrack: { letterSpacing: 0.42 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentBtn: {
    minHeight: 28,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 11.5 },

  topicRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  topicLabel: { fontSize: 11.5 },
  topicCount: {
    fontFamily: mono(400),
    fontSize: 9.5,
    borderRadius: 32,
    paddingVertical: 1,
    paddingHorizontal: 5,
    overflow: 'hidden',
  },

  list: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
  },

  card: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  hero: {
    aspectRatio: 16 / 10,
    minHeight: 128,
    borderBottomWidth: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    padding: 14,
  },
  heroChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    overflow: 'hidden',
    fontFamily: mono(400),
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  gpfaChip: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    overflow: 'hidden',
    fontFamily: mono(400),
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    // Sits on the anchor fill in both themes, so the literal is the token.
    color: '#fff',
  },

  cardHead: {
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
    fontFamily: mono(400),
    fontSize: 10,
    textTransform: 'uppercase',
  },
  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  lockText: {
    fontFamily: mono(400),
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: sans(600),
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: trackDisplay(17),
  },
  meta: { letterSpacing: 0.8, textTransform: 'uppercase' },

  cardBody: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  body: {
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
    fontFamily: sans(400),
    fontSize: 10.5,
  },

  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    paddingLeft: 16,
    paddingRight: 10,
    borderTopWidth: 1,
  },
  footTrack: { letterSpacing: 0.8 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  actionText: {
    fontFamily: sans(500),
    fontSize: 13,
  },

  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: sans(500),
    fontSize: 14,
  },
  emptyBody: {
    fontFamily: sans(400),
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: 'center',
  },
  clearBtn: {
    marginTop: 8,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontFamily: sans(500),
    fontSize: 13,
    color: '#fff',
  },
});
