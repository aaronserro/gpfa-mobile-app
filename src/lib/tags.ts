export type TagSuggestion = {
  key: string;
  label: string;
  count: number;
};

export function normalizeTagToken(value: string): string {
  return value
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseTagInput(value: string, limit = 8): string[] {
  const hashtagMatches = [...value.matchAll(/#([^\s#,]+)/g)].map(
    (match) => match[1] ?? ''
  );
  const tokens = hashtagMatches.length > 0 ? hashtagMatches : value.split(/\s+/);

  return Array.from(
    new Set(tokens.map(normalizeTagToken).filter(Boolean))
  ).slice(0, limit);
}

export function serializeTagInput(value: string | string[], limit = 8): string {
  const tokens = Array.isArray(value) ? value : parseTagInput(value, limit);

  return tokens
    .map(normalizeTagToken)
    .filter(Boolean)
    .slice(0, limit)
    .map((tag) => `#${tag}`)
    .join(' ');
}

export function appendTagToken(
  currentValue: string,
  nextTag: string,
  limit = 8
): string {
  const normalizedTag = normalizeTagToken(nextTag);
  if (!normalizedTag) return serializeTagInput(currentValue, limit);

  const combined = `${currentValue.trim()} #${normalizedTag}`.trim();
  return `${serializeTagInput(parseTagInput(combined, limit))} `;
}

export function getTagSuggestionQuery(value: string): string {
  if (!value.trim() || /\s$/.test(value)) return '';

  const token = value.trimEnd().split(/\s+/).at(-1) ?? '';
  return normalizeTagToken(token.replace(/^#+/, ''));
}

export function formatTagCountText(count: number): string {
  return count === 1 ? '1 use' : `${count} uses`;
}

export function filterTagSuggestions(
  entries: TagSuggestion[],
  query = '',
  limit = 6
): TagSuggestion[] {
  const normalizedQuery = normalizeTagToken(query);
  const seen = new Set<string>();

  return entries
    .filter((entry) => {
      const key = normalizeTagToken(entry.key || entry.label);
      if (!key || seen.has(key)) return false;
      if (normalizedQuery && !key.includes(normalizedQuery)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
