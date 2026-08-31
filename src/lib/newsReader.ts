import type { NewsFeedItem } from '../api/types';

export function newsSummaryBullets(summary: string): string[] {
  const lines = summary
    .split(/\n+/)
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
  return lines.length > 1 ? lines.slice(0, 4) : [summary.trim()].filter(Boolean);
}

export type NewsLinkDestination =
  | { kind: 'external'; url: string }
  | { kind: 'group'; slug: string; id: string }
  | { kind: 'invalid' };

export function newsLinkDestination(href: string): NewsLinkDestination {
  const value = href.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:'
        ? { kind: 'external', url: url.toString() }
        : { kind: 'invalid' };
    } catch {
      return { kind: 'invalid' };
    }
  }

  const match = value.match(/^\/members\/groups\/([a-z0-9-]+)\/([a-z0-9-]+)$/i);
  return match
    ? { kind: 'group', slug: match[1], id: match[2] }
    : { kind: 'invalid' };
}

// The native renderer should display Markdown, never execute embedded HTML.
export function stripMarkdownHtml(markdown: string): string {
  return markdown
    .replace(/<\/?[A-Za-z][^>]*>/g, '')
    .replace(/!\[([^\]]*)\]\(((?:[^()]|\([^)]*\))+?)\)/g, (original, alt: string, target: string) => {
      const destination = newsLinkDestination(target.split(/\s+/)[0] ?? '');
      return destination.kind === 'external' ? original : alt;
    });
}

export function newsStoryPreview(item: NewsFeedItem): string {
  return item.kind === 'radar' ? newsSummaryBullets(item.summary).join(' ') : item.excerpt;
}
