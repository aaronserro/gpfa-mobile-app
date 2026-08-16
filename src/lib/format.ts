/**
 * Initials for an avatar fallback: "Elena Rossi" → "ER".
 *
 * A single-word name has no second initial to take, so it falls back to its
 * first two letters — "Cbus" → "CB" rather than a lone "C".
 */
export const initials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words.map((w) => w[0]).join('') : (words[0] ?? '').slice(0, 2);
  return letters.slice(0, 2).toUpperCase();
};

/**
 * Mark text for an organization. Acronyms members already read as a name
 * ("HOOPP", "PGGM", "AP4") stay whole; anything longer reduces to initials.
 */
export const orgInitials = (name: string): string => {
  const compact = name.replace(/[^A-Za-z0-9]/g, '');
  if (compact.length > 0 && compact.length <= 5 && compact === compact.toUpperCase()) return compact;
  return initials(name);
};
