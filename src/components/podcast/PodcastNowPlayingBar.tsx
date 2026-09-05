import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Article, ArrowClockwise, ArrowCounterClockwise, Pause, Play, X } from '../../ds/icons';
import { useTheme } from '../../ds/ThemeProvider';
import { alpha, mono, sans } from '../../ds/tokens';
import { formatTime, usePodcastPlayer, usePodcastTimeline } from './PlayerProvider';

/**
 * Dense transport docked above the tab bar, from the portal's
 * podcast-now-playing-bar: 15s jumps either side of play/pause, title, mono
 * time readout, a 2px progress strip on the anchor surface, and an action that
 * opens the episode.
 *
 * Renders nothing when no episode is loaded, so App can mount it
 * unconditionally between the screen and the tab bar.
 */
export default function PodcastNowPlayingBar({
  onOpenEpisode,
}: {
  onOpenEpisode: (slug: string) => void;
}) {
  const { t } = useTheme();
  const {
    episode,
    isPlaying,
    loading,
    buffering,
    error,
    toggle,
    skip,
    retry,
    stop,
  } = usePodcastPlayer();
  const { position, duration } = usePodcastTimeline();

  if (!episode) return null;

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const controlsDisabled = loading || !!error;
  const statusText = error
    ?? (loading
      ? 'Loading…'
      : buffering
        ? 'Buffering…'
        : `${formatTime(position)} / ${formatTime(duration)}`);

  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel="Podcast player"
      style={[styles.bar, { backgroundColor: t.surfaceAnchor, borderTopColor: t.ruleOnAnchor }]}
    >
      <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,.15)' }]}>
        <View
          style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: t.brandGreenOnDark }]}
        />
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={() => skip(-15)}
          disabled={controlsDisabled}
          accessibilityRole="button"
          accessibilityLabel="Rewind 15 seconds"
          accessibilityState={{ disabled: controlsDisabled }}
          style={({ pressed }) => [
            styles.jump,
            controlsDisabled && styles.disabled,
            pressed && !controlsDisabled ? { backgroundColor: alpha(t.inkInverse, 0.1) } : null,
          ]}
        >
          <ArrowCounterClockwise size={19} color={t.inkInverse} />
          <Text style={[styles.jumpLabel, { color: t.inkInverse }]}>15</Text>
        </Pressable>

        <Pressable
          onPress={error ? retry : toggle}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={error ? 'Retry episode' : isPlaying ? 'Pause episode' : 'Play episode'}
          accessibilityState={{ disabled: loading, busy: loading }}
          style={({ pressed }) => [styles.play, { backgroundColor: pressed ? t.surfaceSoft : '#fff', opacity: loading ? 0.72 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={t.inkStrong} />
          ) : error ? (
            <ArrowClockwise size={17} color={t.inkStrong} />
          ) : isPlaying ? (
            <Pause size={17} weight="fill" color={t.inkStrong} />
          ) : (
            <Play size={17} weight="fill" color={t.inkStrong} />
          )}
        </Pressable>

        <Pressable
          onPress={() => skip(15)}
          disabled={controlsDisabled}
          accessibilityRole="button"
          accessibilityLabel="Forward 15 seconds"
          accessibilityState={{ disabled: controlsDisabled }}
          style={({ pressed }) => [
            styles.jump,
            controlsDisabled && styles.disabled,
            pressed && !controlsDisabled ? { backgroundColor: alpha(t.inkInverse, 0.1) } : null,
          ]}
        >
          <ArrowClockwise size={19} color={t.inkInverse} />
          <Text style={[styles.jumpLabel, { color: t.inkInverse }]}>15</Text>
        </Pressable>

        <View style={styles.meta}>
          <Text numberOfLines={1} style={[styles.title, { color: '#fff' }]}>
            {episode.title}
          </Text>
          <Text numberOfLines={1} style={[styles.time, { color: alpha(t.inkInverse, 0.7) }]}>
            {statusText}
          </Text>
        </View>

        <Pressable
          onPress={() => onOpenEpisode(episode.slug)}
          accessibilityRole="button"
          accessibilityLabel="Open episode details"
          style={({ pressed }) => [
            styles.action,
            {
              borderColor: 'rgba(255,255,255,.3)',
              backgroundColor: pressed ? 'rgba(255,255,255,.1)' : 'transparent',
            },
          ]}
        >
          <Article size={14} color={t.inkInverse} />
          <Text style={[styles.actionText, { color: t.inkInverse }]}>Episode</Text>
        </Pressable>

        <Pressable
          onPress={() => stop({ resetProgress: true })}
          accessibilityRole="button"
          accessibilityLabel="Stop podcast and close player"
          hitSlop={8}
          style={({ pressed }) => [
            styles.close,
            { backgroundColor: pressed ? 'rgba(255,255,255,.1)' : 'transparent' },
          ]}
        >
          <X size={18} color={t.inkInverse} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1 },
  track: { position: 'absolute', left: 0, right: 0, top: 0, height: 2 },
  fill: { height: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 11,
  },
  jump: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
  jumpLabel: {
    position: 'absolute',
    fontFamily: mono(600),
    fontSize: 6.5,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: sans(500),
    fontSize: 12.5,
  },
  time: {
    marginTop: 2,
    fontFamily: mono(400),
    fontSize: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  actionText: {
    fontFamily: sans(400),
    fontSize: 11.5,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
