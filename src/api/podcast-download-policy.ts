export type PodcastDownloadKind = 'audio' | 'transcript';

export function podcastDownloadFilename(slug: string, kind: PodcastDownloadKind): string {
  const safeSlug = slug
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80) || 'gpfa-podcast';
  return kind === 'transcript' ? `${safeSlug}-transcript.txt` : `${safeSlug}.mp3`;
}

export function podcastDownloadHeaders(
  url: string,
  accessToken: string | null,
  trustedOrigins: string[]
): Record<string, string> {
  const headers: Record<string, string> = {};
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return headers;
  }

  const trusted = trustedOrigins.some((origin) => {
    try {
      return new URL(origin).origin === target.origin;
    } catch {
      return false;
    }
  });
  if (trusted && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (target.hostname.includes('ngrok-free.')) headers['ngrok-skip-browser-warning'] = 'true';
  return headers;
}

export function podcastDownloadMime(kind: PodcastDownloadKind): {
  mimeType: string;
  UTI: string;
} {
  return kind === 'transcript'
    ? { mimeType: 'text/plain', UTI: 'public.plain-text' }
    : { mimeType: 'audio/mpeg', UTI: 'public.audio' };
}
