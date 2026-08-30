import type { AudioSource } from 'expo-audio';

import type { PodcastEpisode } from './types';
import { API_BASE_URL } from './config';
import { refreshPodcastEpisode } from './portal';
import { getAccessToken } from './tokens';

const PROTECTED_ASSET_PATH = /^\/api\/content-assets\/[^/]+$/;
const SIGNED_URL_REFRESH_WINDOW_MS = 10 * 60 * 1000;
const episodeRefreshes = new Map<string, Promise<PodcastEpisode>>();

export type PodcastAudioSourceKind = 'signed-storage' | 'public-external' | 'legacy-proxy';

export class PodcastAudioUnavailableError extends Error {
  constructor(message = 'Audio is unavailable for this episode.') {
    super(message);
    this.name = 'PodcastAudioUnavailableError';
  }
}

/**
 * Turn the catalog's audio URL into a native source. Authorization is attached
 * only to this app's protected asset route so credentials cannot leak to a
 * public storage bucket or third-party podcast host.
 */
export async function podcastAudioSource(
  requestedEpisode: PodcastEpisode
): Promise<{ episode: PodcastEpisode; source: AudioSource; kind: PodcastAudioSourceKind }> {
  const episode = shouldRefreshPodcastAudioUrl(requestedEpisode)
    ? await refreshEpisodeOnce(requestedEpisode.slug)
    : requestedEpisode;
  const rawUrl = episode.audioUrl?.trim();
  if (!rawUrl) throw new PodcastAudioUnavailableError();

  const apiUrl = parseUrl(API_BASE_URL);
  const isRelative = rawUrl.startsWith('/');
  const resolved = isRelative && apiUrl
    ? parseUrl(rawUrl, `${apiUrl.origin}/`)
    : parseUrl(rawUrl);

  if (!resolved || (resolved.protocol !== 'https:' && resolved.protocol !== 'http:')) {
    throw new PodcastAudioUnavailableError('This episode has an invalid audio URL.');
  }
  if (resolved.username || resolved.password) {
    throw new PodcastAudioUnavailableError('This episode has an invalid audio URL.');
  }

  const trustedApiOrigin = apiUrl?.origin === resolved.origin;
  if (resolved.protocol === 'http:' && !(__DEV__ && trustedApiOrigin)) {
    throw new PodcastAudioUnavailableError('This episode requires a secure audio URL.');
  }

  const isProtectedAsset = trustedApiOrigin && PROTECTED_ASSET_PATH.test(resolved.pathname);
  if (!isProtectedAsset) {
    return {
      episode,
      source: { uri: resolved.toString() },
      kind: episode.audioExpiresAt ? 'signed-storage' : 'public-external',
    };
  }

  const token = await getAccessToken();
  if (!token) throw new PodcastAudioUnavailableError('Sign in again to play this episode.');

  return {
    episode,
    source: {
      uri: resolved.toString(),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(resolved.hostname.includes('ngrok-free.')
          ? { 'ngrok-skip-browser-warning': 'true' }
          : {}),
      },
    },
      kind: 'legacy-proxy',
  };
}

  export function shouldRefreshPodcastAudioUrl(episode: PodcastEpisode): boolean {
  if (!episode.audioExpiresAt) return false;
  const expiresAt = new Date(episode.audioExpiresAt).getTime();
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now() + SIGNED_URL_REFRESH_WINDOW_MS;
}

  async function refreshEpisodeOnce(slug: string): Promise<PodcastEpisode> {
    const existing = episodeRefreshes.get(slug);
    if (existing) return existing;

    const refresh = refreshPodcastEpisode(slug).finally(() => {
      if (episodeRefreshes.get(slug) === refresh) episodeRefreshes.delete(slug);
    });
    episodeRefreshes.set(slug, refresh);
    return refresh;
  }

function parseUrl(value: string, base?: string): URL | null {
  if (!value) return null;
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}
