const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface MemberDirectoryDestination {
  organizationSlug: string;
  mentionHandle: string;
}

/** Accept only the member-profile paths emitted by the authenticated web API. */
export function memberDirectoryDestination(href: string): MemberDirectoryDestination | null {
  if (!href.startsWith('/') || href.startsWith('//')) return null;
  try {
    const url = new URL(href, 'https://gpfa.invalid');
    if (url.origin !== 'https://gpfa.invalid' || url.search || url.hash) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 4 || parts[0] !== 'members' || parts[1] !== 'directory') return null;
    const organizationSlug = decodeURIComponent(parts[2]);
    const mentionHandle = decodeURIComponent(parts[3]);
    if (!SLUG.test(organizationSlug) || !SLUG.test(mentionHandle)) return null;
    if (mentionHandle.length < 3 || mentionHandle.length > 48 || UUID_SHAPE.test(mentionHandle)) {
      return null;
    }
    return { organizationSlug, mentionHandle };
  } catch {
    return null;
  }
}
