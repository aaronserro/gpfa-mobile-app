/**
 * The signed-in member, made ambient.
 *
 * `ScreenHeader` draws the profile avatar on every screen, including ones
 * nested three deep (a post inside a group, a role inside the job board).
 * Threading `memberInitials` through all of them would add a prop to ten
 * components that have no other use for it.
 *
 * This holds no state and fetches nothing — `App.tsx` feeds it from the
 * already-resolved `/me` query, so screens stay presentational.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { initials as initialsOf } from '../lib/format';
import type { Member } from '../api/types';

interface MemberValue {
  member: Member | null;
  /** Avatar fallback — the member's own `initials`, or derived from the name. */
  initials: string;
  /** Unread member notifications, shown as the header bell badge. */
  notificationUnreadCount: number;
  /** Opens the notifications sheet from the header bell. */
  openNotifications?: () => void;
  /**
   * Opens the profile sheet. The header avatar is the only way into the
   * profile, and it draws on every screen, so this is ambient for the same
   * reason `initials` is. Absent leaves the avatar inert.
   */
  openProfile?: () => void;
}

const MemberContext = createContext<MemberValue>({
  member: null,
  initials: '',
  notificationUnreadCount: 0,
});

export function MemberProvider({
  member,
  onOpenProfile,
  notificationUnreadCount = 0,
  onOpenNotifications,
  children,
}: {
  member: Member | null;
  /** Owned by `App.tsx` — this provider still holds no state of its own. */
  onOpenProfile?: () => void;
  notificationUnreadCount?: number;
  onOpenNotifications?: () => void;
  children: ReactNode;
}) {
  const value = useMemo<MemberValue>(
    () => ({
      member,
      // A member resolves before any header renders, but DataGate's fallback
      // has an empty name — an empty string draws a blank avatar, not "??".
      initials: member?.name ? member.initials ?? initialsOf(member.name) : '',
      notificationUnreadCount,
      openNotifications: onOpenNotifications,
      openProfile: onOpenProfile,
    }),
    [member, notificationUnreadCount, onOpenNotifications, onOpenProfile]
  );
  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

export const useMember = (): MemberValue => useContext(MemberContext);
