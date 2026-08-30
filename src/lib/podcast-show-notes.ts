const LEADING_MARKDOWN_HEADING = /^[\t ]{0,3}#{1,6}[\t ]+([^\r\n]+)(?:\r?\n+|$)/;

function normalizeMarkdownText(value: string): string {
  return value
    .replace(/[\t ]+#+[\t ]*$/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\\([\\`*_[\]{}()#+\-.!])/g, '$1')
    .replace(/[*_~`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

/** Remove an editorial H1/H2 that merely repeats the episode title. */
export function withoutDuplicateEpisodeTitle(markdown: string, episodeTitle: string): string {
  const trimmed = markdown.trim();
  const heading = trimmed.match(LEADING_MARKDOWN_HEADING);
  if (!heading || normalizeMarkdownText(heading[1]) !== normalizeMarkdownText(episodeTitle)) {
    return trimmed;
  }
  return trimmed.slice(heading[0].length).trimStart();
}

/** Full notes are only useful when they add information beyond the card summary. */
export function distinctEpisodeShowNotes(
  markdown: string | undefined,
  episodeTitle: string,
  summary: string
): string | null {
  if (!markdown?.trim()) return null;
  const notes = withoutDuplicateEpisodeTitle(markdown, episodeTitle);
  if (!notes || normalizeMarkdownText(notes) === normalizeMarkdownText(summary)) return null;
  return notes;
}

export function isSafeShowNotesHref(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
