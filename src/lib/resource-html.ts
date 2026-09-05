import { resourceDownloadHeaders } from '../api/resource-download-policy';

export const MAX_RESOURCE_HTML_BYTES = 1_000_000;

export const BLOCKED_RESOURCE_HTML_TAGS = [
  'applet',
  'audio',
  'base',
  'button',
  'canvas',
  'dialog',
  'embed',
  'fieldset',
  'form',
  'frame',
  'frameset',
  'head',
  'iframe',
  'input',
  'link',
  'marquee',
  'math',
  'meta',
  'noscript',
  'object',
  'option',
  'picture',
  'script',
  'select',
  'source',
  'style',
  'svg',
  'template',
  'textarea',
  'title',
  'video',
] as const;

const BLOCKED_RESOURCE_HTML_TAG_SET = new Set<string>(BLOCKED_RESOURCE_HTML_TAGS);

export function resourceHtmlResponseTypeIsSupported(value: string | null): boolean {
  if (!value) return true;
  const mimeType = value.split(';', 1)[0]?.trim().toLowerCase();
  return mimeType === 'text/html' || mimeType === 'application/xhtml+xml';
}

export function resolveResourceHtmlUrl(value: string, baseUrl: string): string | null {
  try {
    const target = new URL(value, baseUrl);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
    return target.toString();
  } catch {
    return null;
  }
}

export function resourceHtmlImageHeaders(
  value: string,
  baseUrl: string,
  accessToken: string | null,
  trustedOrigins: string[]
): Record<string, string> | undefined {
  const url = resolveResourceHtmlUrl(value, baseUrl);
  if (!url) return undefined;
  const headers = resourceDownloadHeaders(url, accessToken, trustedOrigins);
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export function shouldIgnoreResourceHtmlNode(
  node: { type?: string; name?: string; attribs?: Record<string, string> },
  baseUrl: string
): boolean {
  if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') return false;
  const tagName = node.name?.toLowerCase() ?? '';
  if (BLOCKED_RESOURCE_HTML_TAG_SET.has(tagName)) return true;
  if (tagName === 'img') {
    const source = node.attribs?.src?.trim();
    return !source || resolveResourceHtmlUrl(source, baseUrl) === null;
  }
  return false;
}