import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { PodcastEpisode } from '../../api/types';

/**
 * Playback state for the member podcast section, held above the tab bar so the
 * now-playing bar survives tab switches (the web portal keeps its transport in
 * a provider for the same reason).
 *
 * There is no audio engine wired yet — the app has no audio dependency, so the
 * clock below advances position in real time and every seek/skip updates the
 * same state a real player would. To make it play sound, add `expo-audio` and
 * replace the three marked blocks (load, play/pause, seek); nothing else in the
 * UI changes because the screens only read this context.
 */

export interface PodcastPlayerValue {
  episode: PodcastEpisode | null;
  isPlaying: boolean;
  /** Seconds into the active episode. */
  position: number;
  /** Resume position per slug, including episodes that are not active. */
  positions: Record<string, number | undefined>;
  play: (episode: PodcastEpisode) => void;
  /** Play, or pause when this episode is already the active one. */
  toggleEpisode: (episode: PodcastEpisode) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  stop: () => void;
}

const NOOP_PLAYER: PodcastPlayerValue = {
  episode: null,
  isPlaying: false,
  position: 0,
  positions: {},
  play: () => {},
  toggleEpisode: () => {},
  toggle: () => {},
  seek: () => {},
  skip: () => {},
  stop: () => {},
};

const PlayerContext = createContext<PodcastPlayerValue>(NOOP_PLAYER);

export function PodcastPlayerProvider({ children }: { children: ReactNode }) {
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [positions, setPositions] = useState<Record<string, number | undefined>>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const remember = useCallback((slug: string, seconds: number) => {
    setPositions((prev) => ({ ...prev, [slug]: seconds }));
  }, []);

  // The clock. With expo-audio this becomes the player's status listener.
  useEffect(() => {
    if (!isPlaying || !episode) return;
    timer.current = setInterval(() => {
      setPosition((prev) => {
        const next = Math.min(episode.durationSeconds, prev + 1);
        remember(episode.slug, next);
        if (next >= episode.durationSeconds) setIsPlaying(false);
        return next;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [episode, isPlaying, remember]);

  const play = useCallback(
    (next: PodcastEpisode) => {
      // expo-audio: load next.audioUrl here, then seek to `resume`.
      const resume = positions[next.slug] ?? 0;
      setEpisode(next);
      setPosition(resume >= next.durationSeconds ? 0 : resume);
      setIsPlaying(true);
    },
    [positions]
  );

  const toggle = useCallback(() => {
    // expo-audio: player.play() / player.pause().
    setIsPlaying((v) => !v);
  }, []);

  const toggleEpisode = useCallback(
    (next: PodcastEpisode) => {
      if (episode?.slug === next.slug) {
        toggle();
        return;
      }
      play(next);
    },
    [episode, play, toggle]
  );

  const seek = useCallback(
    (seconds: number) => {
      if (!episode) return;
      // expo-audio: player.seekTo(clamped).
      const clamped = Math.max(0, Math.min(episode.durationSeconds, seconds));
      setPosition(clamped);
      remember(episode.slug, clamped);
    },
    [episode, remember]
  );

  const skip = useCallback((delta: number) => seek(position + delta), [position, seek]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setEpisode(null);
  }, []);

  const value = useMemo<PodcastPlayerValue>(
    () => ({
      episode,
      isPlaying,
      position,
      positions,
      play,
      toggleEpisode,
      toggle,
      seek,
      skip,
      stop,
    }),
    [episode, isPlaying, position, positions, play, toggleEpisode, toggle, seek, skip, stop]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export const usePodcastPlayer = (): PodcastPlayerValue => useContext(PlayerContext);

/** Seconds left, or null when the episode has not been started. */
export function remainingLabel(
  episode: PodcastEpisode,
  positions: Record<string, number | undefined>
): string | null {
  const at = positions[episode.slug];
  if (at === undefined || at <= 0) return null;
  const left = episode.durationSeconds - at;
  if (left < 30) return 'Played';
  return `${Math.max(1, Math.round(left / 60))} min left`;
}

/** Played fraction 0–1 for the waveform fill. */
export function playedRatio(
  episode: PodcastEpisode,
  positions: Record<string, number | undefined>
): number {
  const at = positions[episode.slug] ?? 0;
  if (!episode.durationSeconds) return 0;
  return Math.min(1, Math.max(0, at / episode.durationSeconds));
}

/** m:ss, or h:mm:ss past an hour. */
export function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const total = Math.floor(value);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
