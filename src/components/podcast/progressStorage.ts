import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gpfa.podcastProgress.v1';
const STORAGE_VERSION = 1;

export type PodcastPositions = Record<string, number | undefined>;

export function withoutPodcastPosition(
  positions: PodcastPositions,
  slug: string
): PodcastPositions {
  const next = { ...positions };
  delete next[slug];
  return next;
}

interface StoredPodcastProgress {
  version: number;
  positionsBySlug: Record<string, number>;
}

export async function loadPodcastPositions(): Promise<PodcastPositions> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !isRecord(parsed.positionsBySlug)) {
      return {};
    }

    const positions: PodcastPositions = {};
    for (const [slug, seconds] of Object.entries(parsed.positionsBySlug)) {
      if (slug.trim().length > 0 && isPosition(seconds)) positions[slug] = seconds;
    }
    return positions;
  } catch {
    return {};
  }
}

export async function savePodcastPositions(positions: PodcastPositions): Promise<void> {
  const positionsBySlug = Object.fromEntries(
    Object.entries(positions).filter(
      ([slug, seconds]) => slug.trim().length > 0 && isPosition(seconds)
    )
  ) as Record<string, number>;
  const payload: StoredPodcastProgress = {
    version: STORAGE_VERSION,
    positionsBySlug,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Resume progress is best-effort and must never block playback.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
