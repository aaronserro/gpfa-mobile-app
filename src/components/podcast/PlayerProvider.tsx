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
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';

import { podcastAudioSource } from '../../api/podcast-audio';
import type { PodcastEpisode } from '../../api/types';
import { useAuth } from '../../auth/AuthProvider';
import {
  loadPodcastPositions,
  savePodcastPositions,
  withoutPodcastPosition,
  type PodcastPositions,
} from './progressStorage';
import { podcastStartPosition } from './playback-position';

const LOAD_TIMEOUT_MS = 20_000;
const PROGRESS_SAVE_INTERVAL_MS = 5_000;

interface PendingLoad {
  generation: number;
  resumeAt: number;
  resumeApplied: boolean;
  playRequested: boolean;
}

export type PodcastPlaybackPhase =
  | 'idle'
  | 'preparing'
  | 'loading'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'error';

export interface PodcastStopOptions {
  /** Remove the active episode's resume position instead of preserving it. */
  resetProgress?: boolean;
}

function tracePlayback(
  slug: string,
  generation: number,
  startedAt: number,
  event: string,
  details: Record<string, string | number | boolean | null> = {}
) {
  if (!__DEV__) return;
  console.info('[podcast-player]', {
    event,
    slug,
    generation,
    elapsedMs: Date.now() - startedAt,
    ...details,
  });
}

export interface PodcastPlayerValue {
  episode: PodcastEpisode | null;
  isPlaying: boolean;
  loading: boolean;
  buffering: boolean;
  error: string | null;
  phase: PodcastPlaybackPhase;
  /** Resume position per slug, including episodes that are not active. */
  positions: PodcastPositions;
  play: (episode: PodcastEpisode) => void;
  /** Load or resume an episode at an exact transcript timestamp. */
  playFrom: (episode: PodcastEpisode, seconds: number) => void;
  /** Play, or pause when this episode is already the active one. */
  toggleEpisode: (episode: PodcastEpisode) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  retry: () => void;
  stop: (options?: PodcastStopOptions) => void;
}

export interface PodcastTimelineValue {
  /** Seconds into the active episode, sourced from the native player. */
  position: number;
  /** Native duration when loaded, otherwise the catalog duration. */
  duration: number;
}

const NOOP_PLAYER: PodcastPlayerValue = {
  episode: null,
  isPlaying: false,
  loading: false,
  buffering: false,
  error: null,
  phase: 'idle',
  positions: {},
  play: () => {},
  playFrom: () => {},
  toggleEpisode: () => {},
  toggle: () => {},
  seek: () => {},
  skip: () => {},
  retry: () => {},
  stop: () => {},
};

const PlayerContext = createContext<PodcastPlayerValue>(NOOP_PLAYER);
const TimelineContext = createContext<PodcastTimelineValue>({ position: 0, duration: 0 });

export function PodcastPlayerProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const player = useAudioPlayer(null, {
    updateInterval: 500,
    downloadFirst: false,
  });
  const status = useAudioPlayerStatus(player);
  const statusRef = useRef(status);
  statusRef.current = status;
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [positions, setPositions] = useState<PodcastPositions>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startupPhase, setStartupPhase] = useState<'preparing' | 'loading' | null>(null);

  const positionsRef = useRef<PodcastPositions>({});
  const hydrationRef = useRef<Promise<PodcastPositions> | null>(null);
  const audioModeRef = useRef<Promise<void> | null>(null);
  const generationRef = useRef(0);
  const pendingLoadRef = useRef<PendingLoad | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPlayingRef = useRef(false);
  const loadStartedAtRef = useRef(0);

  const remember = useCallback((slug: string, seconds: number, publish = false) => {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const previous = positionsRef.current[slug];
    if (!publish && previous !== undefined && Math.abs(previous - seconds) < 0.75) return;
    const next = { ...positionsRef.current, [slug]: seconds };
    positionsRef.current = next;
    if (publish) setPositions(next);
  }, []);

  const publishPositions = useCallback(() => {
    setPositions({ ...positionsRef.current });
  }, []);

  const ensurePositionsLoaded = useCallback(() => {
    if (!hydrationRef.current) {
      hydrationRef.current = loadPodcastPositions().then((stored) => {
        const merged = { ...stored, ...positionsRef.current };
        positionsRef.current = merged;
        setPositions(merged);
        return merged;
      });
    }
    return hydrationRef.current;
  }, []);

  const ensureAudioMode = useCallback(() => {
    if (!audioModeRef.current) {
      audioModeRef.current = setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      }).catch((cause) => {
        audioModeRef.current = null;
        throw cause;
      });
    }
    return audioModeRef.current;
  }, []);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = null;
  }, []);

  const failLoad = useCallback((generation: number, slug: string, message: string) => {
    if (generation !== generationRef.current) return;
    tracePlayback(slug, generation, loadStartedAtRef.current, 'failed');
    clearLoadTimeout();
    pendingLoadRef.current = null;
    try {
      player.pause();
    } catch {
      // Error reporting must survive a native cleanup failure.
    }
    try {
      player.clearLockScreenControls();
    } catch {
      // Lock-screen controls are optional for foreground playback.
    }
    try {
      player.replace(null);
    } catch {
      // The visible retry state is more useful than another cleanup exception.
    }
    setLoading(false);
    setStartupPhase(null);
    setError(message);
  }, [clearLoadTimeout, player]);

  const loadEpisode = useCallback(async (next: PodcastEpisode, requestedStart?: number) => {
    const generation = ++generationRef.current;
    const startedAt = Date.now();
    loadStartedAtRef.current = startedAt;
    clearLoadTimeout();
    pendingLoadRef.current = null;
    setEpisode(next);
    setLoading(true);
    setStartupPhase('preparing');
    setError(null);
    tracePlayback(next.slug, generation, startedAt, 'tap');

    try {
      player.pause();
      try {
        player.clearLockScreenControls();
      } catch {
        // Expo Go does not represent the release build's lock-screen setup.
      }
      void savePodcastPositions(positionsRef.current);

      await Promise.all([ensurePositionsLoaded(), ensureAudioMode()]);
      const resolved = await podcastAudioSource(next);
      if (generation !== generationRef.current) return;
      setEpisode(resolved.episode);
      const expiresAt = resolved.episode.audioExpiresAt
        ? new Date(resolved.episode.audioExpiresAt).getTime()
        : null;
      tracePlayback(resolved.episode.slug, generation, startedAt, 'source-resolved', {
        sourceKind: resolved.kind,
        expiryMinutes: expiresAt && Number.isFinite(expiresAt)
          ? Math.max(0, Math.round((expiresAt - Date.now()) / 60_000))
          : null,
      });

      const saved = positionsRef.current[resolved.episode.slug] ?? 0;
      const resumeAt = podcastStartPosition(
        saved,
        requestedStart,
        resolved.episode.durationSeconds
      );
      const pending: PendingLoad = {
        generation,
        resumeAt,
        resumeApplied: false,
        playRequested: false,
      };
      pendingLoadRef.current = pending;
      player.replace(resolved.source);
      setStartupPhase('loading');
      tracePlayback(resolved.episode.slug, generation, startedAt, 'replaced', {
        resumeAt: Math.round(resumeAt),
      });

      // A zero-position episode can ask AVPlayer/ExoPlayer to play immediately;
      // native playback queues until enough of the remote source is available.
      if (resumeAt <= 0) {
        player.play();
        pending.playRequested = true;
        tracePlayback(resolved.episode.slug, generation, startedAt, 'play-requested');
      }

      loadTimeoutRef.current = setTimeout(() => {
        tracePlayback(resolved.episode.slug, generation, startedAt, 'timeout');
        failLoad(
          generation,
          resolved.episode.slug,
          'The episode took too long to load. Check your connection and try again.'
        );
      }, LOAD_TIMEOUT_MS);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The episode could not be loaded.';
      failLoad(generation, next.slug, message);
    }
  }, [clearLoadTimeout, ensureAudioMode, ensurePositionsLoaded, failLoad, player]);

  // Once the replacement source is genuinely loaded, restore progress before
  // starting so listeners never hear the episode jump from zero to its resume point.
  useEffect(() => {
    const pending = pendingLoadRef.current;
    if (!pending || pending.resumeApplied || !status.isLoaded || !player.isLoaded || !episode) return;
    pending.resumeApplied = true;
    tracePlayback(episode.slug, pending.generation, loadStartedAtRef.current, 'ready');

    void (async () => {
      try {
        if (pending.resumeAt > 0) await player.seekTo(pending.resumeAt);
        if (pending.generation !== generationRef.current) return;
        if (!pending.playRequested) {
          player.play();
          pending.playRequested = true;
          tracePlayback(episode.slug, pending.generation, loadStartedAtRef.current, 'play-requested');
        }
        clearLoadTimeout();
        pendingLoadRef.current = null;
        setLoading(false);
        setStartupPhase(null);
        setError(null);
        try {
          player.setActiveForLockScreen(
            true,
            {
              title: episode.title,
              artist: episode.people.map((person) => person.name).join(', ') || 'GPFA',
              albumTitle: 'GPFA Podcast',
            },
            { showSeekBackward: true, showSeekForward: true }
          );
        } catch {
          tracePlayback(
            episode.slug,
            pending.generation,
            loadStartedAtRef.current,
            'lock-screen-unavailable'
          );
        }
      } catch {
        failLoad(
          pending.generation,
          episode.slug,
          'The episode could not restore its playback position.'
        );
      }
    })();
  }, [clearLoadTimeout, episode, failLoad, player, status.isLoaded]);

  useEffect(() => {
    if (!episode || !status.playing) return;
    tracePlayback(episode.slug, generationRef.current, loadStartedAtRef.current, 'playing');
  }, [episode, status.playing]);

  // Native status is authoritative. Keep only coarse resume snapshots in React
  // state so the episode list does not rerender twice per second unnecessarily.
  useEffect(() => {
    if (!episode || loading || !status.isLoaded) return;
    const nativeDuration = status.duration > 0 ? status.duration : episode.durationSeconds;
    const nextPosition = status.didJustFinish ? nativeDuration : status.currentTime;
    remember(episode.slug, nextPosition, status.didJustFinish);
    if (status.didJustFinish) void savePodcastPositions(positionsRef.current);
  }, [episode, loading, remember, status.currentTime, status.didJustFinish, status.duration, status.isLoaded]);

  useEffect(() => {
    if (!episode || loading) return;
    const playbackState = status.playbackState.toLowerCase();
    if (playbackState !== 'failed' && playbackState !== 'error') return;
    try {
      player.pause();
    } catch {
      // Preserve the visible error even if native cleanup also fails.
    }
    setStartupPhase(null);
    setError('Playback stopped unexpectedly. Try loading the episode again.');
  }, [episode, loading, player, status.playbackState]);

  useEffect(() => {
    if (!status.playing || !episode) return;
    const interval = setInterval(() => {
      publishPositions();
      void savePodcastPositions(positionsRef.current);
    }, PROGRESS_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [episode, publishPositions, status.playing]);

  useEffect(() => {
    if (wasPlayingRef.current && !status.playing) {
      publishPositions();
      void savePodcastPositions(positionsRef.current);
    }
    wasPlayingRef.current = status.playing;
  }, [publishPositions, status.playing]);

  useEffect(() => {
    void ensurePositionsLoaded();
    void ensureAudioMode().catch(() => {
      // The actionable error is shown if the member attempts playback.
    });
  }, [ensureAudioMode, ensurePositionsLoaded]);

  const play = useCallback((next: PodcastEpisode) => {
    void loadEpisode(next);
  }, [loadEpisode]);

  const playFrom = useCallback((next: PodcastEpisode, seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    const target = Math.max(0, seconds);
    const current = statusRef.current;

    if (episode?.slug !== next.slug || loading || !current.isLoaded) {
      void loadEpisode(next, target);
      return;
    }

    const nativeDuration = current.duration > 0 ? current.duration : next.durationSeconds;
    const clamped = nativeDuration > 0 ? Math.min(target, nativeDuration) : target;
    void player.seekTo(clamped).then(() => {
      remember(next.slug, clamped, true);
      void savePodcastPositions(positionsRef.current);
      player.play();
    }).catch(() => setError('The episode could not seek to that position.'));
  }, [episode?.slug, loadEpisode, loading, player, remember]);

  const retry = useCallback(() => {
    if (episode) void loadEpisode(episode);
  }, [episode, loadEpisode]);

  const toggle = useCallback(() => {
    if (!episode || loading) return;
    const current = statusRef.current;
    if (error || !current.isLoaded) {
      void loadEpisode(episode);
      return;
    }
    if (current.playing) {
      try {
        player.pause();
      } catch {
        setError('The episode could not be paused. Try loading it again.');
        return;
      }
      publishPositions();
      void savePodcastPositions(positionsRef.current);
      return;
    }

    const nativeDuration = current.duration > 0 ? current.duration : episode.durationSeconds;
    if (nativeDuration > 0 && current.currentTime >= nativeDuration - 1) {
      void player.seekTo(0).then(() => {
        remember(episode.slug, 0, true);
        player.play();
      });
      return;
    }
    try {
      player.play();
    } catch {
      setError('The episode could not resume. Try loading it again.');
    }
  }, [episode, error, loadEpisode, loading, player, publishPositions, remember]);

  const toggleEpisode = useCallback((next: PodcastEpisode) => {
    if (episode?.slug === next.slug) {
      toggle();
      return;
    }
    play(next);
  }, [episode, play, toggle]);

  const seek = useCallback((seconds: number) => {
    const current = statusRef.current;
    if (!episode || loading || !current.isLoaded) return;
    const nativeDuration = current.duration > 0 ? current.duration : episode.durationSeconds;
    const clamped = Math.max(0, Math.min(nativeDuration, seconds));
    void player.seekTo(clamped).then(() => {
      remember(episode.slug, clamped, true);
      void savePodcastPositions(positionsRef.current);
    }).catch(() => setError('The episode could not seek to that position.'));
  }, [episode, loading, player, remember]);

  const skip = useCallback((delta: number) => {
    seek(statusRef.current.currentTime + delta);
  }, [seek]);

  const stop = useCallback((options: PodcastStopOptions = {}) => {
    const activeSlug = episode?.slug;
    generationRef.current += 1;
    clearLoadTimeout();
    pendingLoadRef.current = null;
    try {
      player.pause();
    } catch {
      // State still needs to clear when native teardown is unavailable.
    }
    try {
      player.clearLockScreenControls();
    } catch {
      // Lock-screen cleanup is best-effort.
    }
    try {
      player.replace(null);
    } catch {
      // The provider state remains authoritative after sign-out/stop.
    }
    if (options.resetProgress && activeSlug) {
      const next = withoutPodcastPosition(positionsRef.current, activeSlug);
      positionsRef.current = next;
      setPositions(next);
      void savePodcastPositions(next);
    } else {
      publishPositions();
      void savePodcastPositions(positionsRef.current);
    }
    setEpisode(null);
    setLoading(false);
    setStartupPhase(null);
    setError(null);
  }, [clearLoadTimeout, episode?.slug, player, publishPositions]);

  useEffect(() => {
    if (!isSignedIn && episode) stop();
  }, [episode, isSignedIn, stop]);

  useEffect(() => () => {
    generationRef.current += 1;
    clearLoadTimeout();
    try {
      player.clearLockScreenControls();
    } catch {
      // Provider teardown must not surface an unhandled native exception.
    }
    void savePodcastPositions(positionsRef.current);
  }, [clearLoadTimeout, player]);

  const position = !loading && status.isLoaded
    ? status.currentTime
    : episode
      ? positions[episode.slug] ?? 0
      : 0;
  const phase: PodcastPlaybackPhase = error
    ? 'error'
    : startupPhase
      ?? (!episode
        ? 'idle'
        : status.playing
          ? 'playing'
          : status.isBuffering
            ? 'buffering'
            : 'paused');
  const duration = !loading && status.isLoaded && status.duration > 0
    ? status.duration
    : episode?.durationSeconds ?? 0;

  const value = useMemo<PodcastPlayerValue>(() => ({
    episode,
    isPlaying: !loading && status.playing,
    loading,
    buffering: status.isBuffering,
    error,
    phase,
    positions,
    play,
    playFrom,
    toggleEpisode,
    toggle,
    seek,
    skip,
    retry,
    stop,
  }), [
    episode,
    error,
    loading,
    phase,
    play,
    playFrom,
    positions,
    retry,
    seek,
    skip,
    status.isBuffering,
    status.playing,
    stop,
    toggle,
    toggleEpisode,
  ]);

  const timeline = useMemo<PodcastTimelineValue>(() => ({
    position,
    duration,
  }), [duration, position]);

  return (
    <PlayerContext.Provider value={value}>
      <TimelineContext.Provider value={timeline}>{children}</TimelineContext.Provider>
    </PlayerContext.Provider>
  );
}

export const usePodcastPlayer = (): PodcastPlayerValue => useContext(PlayerContext);
export const usePodcastTimeline = (): PodcastTimelineValue => useContext(TimelineContext);

/** Seconds left, or null when the episode has not been started. */
export function remainingLabel(
  episode: PodcastEpisode,
  positions: PodcastPositions
): string | null {
  const at = positions[episode.slug];
  if (at === undefined || at <= 0) return null;
  if (!episode.durationSeconds) return null;
  const left = episode.durationSeconds - at;
  if (left < 30) return 'Played';
  return `${Math.max(1, Math.round(left / 60))} min left`;
}

/** Played fraction 0–1 for the waveform fill. */
export function playedRatio(
  episode: PodcastEpisode,
  positions: PodcastPositions
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
