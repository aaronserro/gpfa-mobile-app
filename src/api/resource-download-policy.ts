export function resourceDownloadFilename(value: string | undefined, fallbackId: string): string {
  const candidate = value?.trim() || `${fallbackId}.bin`;
  return candidate
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._-]+/, '')
    .slice(-160) || 'gpfa-resource.bin';
}

export function resourceDownloadHeaders(
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

  const trustedOrigin = trustedOrigins.some((origin) => {
    try {
      return new URL(origin).origin === target.origin;
    } catch {
      return false;
    }
  });
  if (trustedOrigin && target.pathname.startsWith('/api/content-assets/') && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (trustedOrigin && target.hostname.includes('ngrok-free.')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  return headers;
}

export function resourceDownloadMedia(contentType: string | undefined): {
  mimeType: string;
  UTI: string;
} {
  const mimeType = contentType?.trim().toLowerCase() || 'application/octet-stream';
  if (mimeType === 'application/pdf') return { mimeType, UTI: 'com.adobe.pdf' };
  if (mimeType.startsWith('image/')) return { mimeType, UTI: 'public.image' };
  if (mimeType.startsWith('audio/')) return { mimeType, UTI: 'public.audio' };
  if (mimeType.startsWith('video/')) return { mimeType, UTI: 'public.movie' };
  if (mimeType.startsWith('text/')) return { mimeType, UTI: 'public.text' };
  return { mimeType, UTI: 'public.data' };
}
