import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  BookOpen,
  CalendarDots,
  CaretRight,
  GearSix,
  Megaphone,
} from '../ds/icons';
import {
  Avatar,
  GroupLabel,
  MenuRow,
  PageActions,
  PageHead,
  StickyTitle,
} from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans } from '../ds/tokens';
import { initials as initialsOf } from '../lib/format';
import type { Member } from '../api/types';

/**
 * v2's Menu tab. It replaced the old "More" overflow: the profile moved here
 * out of the header, and the rest is grouped under uppercase labels rather than
 * the previous description-per-row list.
 */
export default function MoreScreen({
  member,
  annualMeetingEnabled,
  annualMeetingStatus,
  updateCount,
  onOpenAnnualMeeting,
  onOpenUpdates,
  onOpenEvents,
  onOpenResources,
  onOpenAccount,
}: {
  member: Member;
  annualMeetingEnabled: boolean;
  annualMeetingStatus: string;
  updateCount: number;
  onOpenAnnualMeeting: () => void;
  onOpenUpdates: () => void;
  onOpenEvents: () => void;
  onOpenResources: () => void;
  onOpenAccount: () => void;
}) {
  const { t } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;

  const card = { backgroundColor: t.surfacePaper, borderColor: t.rule };

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <StickyTitle scrollY={scrollY} title="Menu" actions={<PageActions />} />
      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        <PageHead title="Menu" actions={<PageActions />} />

        <View style={styles.body}>
          <Pressable
            onPress={onOpenAccount}
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            style={({ pressed }) => [
              styles.profileCard,
              card,
              pressed ? styles.pressed : null,
            ]}
          >
            <Avatar
              initials={member.initials ?? initialsOf(member.name)}
              photoUrl={member.avatarUrl ?? undefined}
              size={48}
            />
            <View style={styles.flex}>
              <Text style={[styles.profileName, { color: t.inkStrong }]}>{member.name}</Text>
              <Text style={[styles.profileMeta, { color: t.inkMuted }]} numberOfLines={1}>
                {[member.role, member.org].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <CaretRight size={16} color={t.ruleStrong} />
          </Pressable>

          <View style={styles.group}>
            <GroupLabel>Knowledge</GroupLabel>
            <View style={[styles.rows, card]}>
              <MenuRow
                first
                label="Resources"
                Glyph={BookOpen}
                onPress={onOpenResources}
              />
              {annualMeetingEnabled && (
                <MenuRow
                  label="Annual Meeting"
                  Glyph={CalendarDots}
                  onPress={onOpenAnnualMeeting}
                />
              )}
            </View>
          </View>

          <View style={styles.group}>
            <GroupLabel>Membership</GroupLabel>
            <View style={[styles.rows, card]}>
              <MenuRow first label="Events" Glyph={CalendarDots} onPress={onOpenEvents} />
              <MenuRow
                label="Updates"
                Glyph={Megaphone}
                onPress={onOpenUpdates}
                value={updateCount > 0 ? String(updateCount) : undefined}
              />
            </View>
          </View>

          <View style={styles.group}>
            <GroupLabel>Account</GroupLabel>
            <View style={[styles.rows, card]}>
              <MenuRow first label="Account & settings" Glyph={GearSix} onPress={onOpenAccount} />
            </View>
          </View>

        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingBottom: 34 },
  pressed: { opacity: 0.7 },
  body: { padding: 16, gap: 20 },
  group: { gap: 0 },
  rows: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  profileCard: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  profileName: { fontFamily: sans(600), fontSize: 17 },
  profileMeta: { marginTop: 3, fontFamily: sans(400), fontSize: 13.5 },
});
