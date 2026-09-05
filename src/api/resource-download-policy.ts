export function resourceDownloadFilename(value: string | undefined, fallbackId: string): string {
  const candidate = value?.trim() || `${fallbackId}.bin`;
  return candidate
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._-]+/, '')
    .slice(-160) || 'gpfa-resource.bin';
}

export type ResourcePreviewKind = 'pdf' | 'image' | 'text' | 'html' | 'external';

type PreviewableResourceFile = {
  href: string;
  fileName?: string;
  contentType?: string;
  previewable: boolean;
};

const IMAGE_EXTENSIONS = new Set(['avif', 'gif', 'heic', 'jpeg', 'jpg', 'png', 'svg', 'webp']);
const TEXT_EXTENSIONS = new Set(['csv', 'json', 'md', 'markdown', 'txt']);
const WEB_EXTENSIONS = new Set(['htm', 'html', 'xhtml']);

function resourceExtension(file: PreviewableResourceFile): string {
  const fromName = file.fileName?.trim();
  let candidate = fromName;
  if (!candidate) {
    try {
      candidate = new URL(file.href).pathname;
    } catch {
      candidate = file.href;
    }
  }
  const match = candidate?.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? '';
}

/** Selects the safest in-app renderer. MIME type wins; extension is a fallback. */
export function resourcePreviewKind(file: PreviewableResourceFile): ResourcePreviewKind {
  const mimeType = file.contentType?.split(';', 1)[0]?.trim().toLowerCase() ?? '';

  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
    return file.previewable ? 'html' : 'external';
  }
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';

  // A specific, unsupported MIME type is authoritative and must not be executed as HTML.
  if (mimeType && mimeType !== 'application/octet-stream') return 'external';

  const extension = resourceExtension(file);
  if (extension === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (TEXT_EXTENSIONS.has(extension)) return 'text';
  if (WEB_EXTENSIONS.has(extension) && file.previewable) return 'html';
  return 'external';
}

export function resourceCanPreview(file: PreviewableResourceFile): boolean {
  return resourcePreviewKind(file) !== 'external';
}

export function resourceIsTrustedContentAsset(
  url: string,
  trustedOrigins: string[]
): boolean {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return false;
  }

  return target.pathname.startsWith('/api/content-assets/') && trustedOrigins.some((origin) => {
    try {
      return new URL(origin).origin === target.origin;
    } catch {
      return false;
    }
  });
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
  if (resourceIsTrustedContentAsset(url, trustedOrigins) && accessToken) {
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
