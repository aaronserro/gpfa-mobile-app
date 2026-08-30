import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ScrollView,
} from 'react-native';

import type { PodcastEpisode, PodcastTranscriptSegment } from '../../api/types';
import { useTheme } from '../../ds/ThemeProvider';
import { mono, sans, trackDisplay } from '../../ds/tokens';
import { formatTime, usePodcastPlayer, usePodcastTimeline } from './PlayerProvider';
import { activeTranscriptSegmentIndex, centeredTranscriptOffset } from './transcript';

export default function PodcastTranscript({
  episode,
  segments,
  scrollRef,
  viewportHeight,
  manualScrollVersion,
}: {
  episode: PodcastEpisode;
  segments: PodcastTranscriptSegment[];
  scrollRef: RefObject<ScrollView | null>;
  viewportHeight: number;
  manualScrollVersion: number;
}) {
  const { t } = useTheme();
  const player = usePodcastPlayer();
  const timeline = usePodcastTimeline();
  const [following, setFollowing] = useState(false);
  const [transcriptTop, setTranscriptTop] = useState(0);
  const layouts = useRef(new Map<number, { y: number; height: number }>());
  const activeIndex = useMemo(
    () => player.episode?.slug === episode.slug
      ? activeTranscriptSegmentIndex(segments, timeline.position)
      : -1,
    [episode.slug, player.episode?.slug, segments, timeline.position]
  );

  useEffect(() => {
    setFollowing(false);
  }, [episode.slug, manualScrollVersion]);

  const scrollToActive = useCallback((animated: boolean) => {
    const layout = layouts.current.get(activeIndex);
    if (!layout || activeIndex < 0 || viewportHeight <= 0) return;
    scrollRef.current?.scrollTo({
      y: centeredTranscriptOffset(transcriptTop, layout.y, layout.height, viewportHeight),
      animated,
    });
  }, [activeIndex, scrollRef, transcriptTop, viewportHeight]);

  useEffect(() => {
    if (following) scrollToActive(true);
  }, [following, scrollToActive]);

  const beginFollowing = () => {
    setFollowing(true);
    scrollToActive(true);
  };

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setTranscriptTop(event.nativeEvent.layout.y)}
      style={[styles.section, { borderTopColor: t.ruleHairline }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.inkStrong }]}>Transcript</Text>
        {activeIndex >= 0 && !following ? (
          <Pressable
            accessibilityRole="button"
            onPress={beginFollowing}
            style={[styles.followButton, { borderColor: t.ruleHairline }]}
          >
            <Text style={[styles.followText, { color: t.brandGreen }]}>Follow transcript</Text>
          </Pressable>
        ) : following ? (
          <Text style={[styles.followingText, { color: t.inkMuted }]}>Following</Text>
        ) : null}
      </View>

      {segments.map((segment, index) => {
        const active = index === activeIndex;
        return (
          <View
            key={`${segment.start}-${segment.text}`}
            onLayout={(event) => layouts.current.set(index, event.nativeEvent.layout)}
            style={[
              styles.segment,
              active && {
                backgroundColor: t.surfaceSoft,
                borderLeftColor: t.brandGreen,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Play from ${formatTime(segment.start)}`}
              accessibilityState={{ selected: active }}
              onPress={() => player.playFrom(episode, segment.start)}
              hitSlop={6}
            >
              <Text style={[styles.time, { color: active ? t.brandGreen : t.inkMuted }]}>
                {formatTime(segment.start)}
              </Text>
            </Pressable>
            <Text
              style={[
                styles.text,
                { color: active ? t.inkStrong : t.inkBody },
                active && { fontFamily: sans(500) },
              ]}
            >
              {segment.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18, paddingTop: 18, borderTopWidth: 1 },
  header: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { fontFamily: sans(600), fontSize: 15, letterSpacing: trackDisplay(15) },
  followButton: { minHeight: 32, justifyContent: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10 },
  followText: { fontFamily: sans(600), fontSize: 11.5 },
  followingText: { fontFamily: sans(500), fontSize: 11.5 },
  segment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: -8,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
    borderRadius: 4,
  },
  time: { width: 54, fontFamily: mono(500), fontSize: 11.5, lineHeight: 19 },
  text: { flex: 1, fontFamily: sans(400), fontSize: 13, lineHeight: 20.8 },
});
