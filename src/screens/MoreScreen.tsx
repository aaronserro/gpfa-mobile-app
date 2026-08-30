import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BookOpen,
  Briefcase,
  CalendarDots,
  CaretRight,
  Megaphone,
  type Icon,
} from '../ds/icons';
import { Avatar, MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans, trackDisplay } from '../ds/tokens';
import { initials as initialsOf } from '../lib/format';
import type { Member } from '../api/types';

export default function MoreScreen({
  member,
  annualMeetingEnabled,
  annualMeetingStatus,
  updateCount,
  eventCount,
  resourceCount,
  jobCount,
  onOpenAnnualMeeting,
  onOpenUpdates,
  onOpenEvents,
  onOpenResources,
  onOpenJobBoard,
  onOpenAccount,
}: {
  member: Member;
  annualMeetingEnabled: boolean;
  annualMeetingStatus: string;
  updateCount: number;
  eventCount: number;
  resourceCount: number;
  jobCount: number;
  onOpenAnnualMeeting: () => void;
  onOpenUpdates: () => void;
  onOpenEvents: () => void;
  onOpenResources: () => void;
  onOpenJobBoard: () => void;
  onOpenAccount: () => void;
}) {
  const { t } = useTheme();

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="More" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={[styles.introTitle, { color: t.inkStrong }]}>Everything else, close at hand.</Text>
          <Text style={[styles.introCopy, { color: t.inkMuted }]}>Updates, member tools and your account in one place.</Text>
        </View>

        <SectionLabel label="Featured & updates" />
        <View style={[styles.group, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          {annualMeetingEnabled && (
            <MenuRow
              icon={CalendarDots}
              iconTone="green"
              label="Annual Meeting"
              description={annualMeetingStatus}
              onPress={onOpenAnnualMeeting}
            />
          )}
          <MenuRow
            icon={Megaphone}
            iconTone="amber"
            label="Updates"
            description="Announcements and member surveys"
            badge={updateCount}
            divided={annualMeetingEnabled}
            onPress={onOpenUpdates}
          />
        </View>

        <SectionLabel label="Explore" />
        <View style={[styles.group, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          <MenuRow
            icon={CalendarDots}
            iconTone="green"
            label="Events"
            description={`${eventCount} upcoming member events`}
            onPress={onOpenEvents}
          />
          <MenuRow
            icon={BookOpen}
            iconTone="blue"
            label="Resources"
            description={`${resourceCount} library items and member podcasts`}
            divided
            onPress={onOpenResources}
          />
          <MenuRow
            icon={Briefcase}
            iconTone="amber"
            label="Job Board"
            description={`${jobCount} open roles across the member network`}
            divided
            onPress={onOpenJobBoard}
          />
        </View>

        <SectionLabel label="Account" />
        <Pressable
          onPress={onOpenAccount}
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: pressed ? alpha(t.surfaceSoft, 0.5) : t.surfacePaper, borderColor: t.ruleHairline },
          ]}
        >
          <Avatar initials={member.initials ?? initialsOf(member.name)} photoUrl={member.avatarUrl ?? undefined} size={44} />
          <View style={styles.flex}>
            <Text style={[styles.profileName, { color: t.inkStrong }]}>{member.name}</Text>
            <Text style={[styles.profileMeta, { color: t.inkMuted }]} numberOfLines={1}>
              {[member.org, member.role].filter(Boolean).join(' · ')}
            </Text>
            <MastheadMeta size={9.5} color={t.brandGreen}>PROFILE · THEME · SIGN OUT</MastheadMeta>
          </View>
          <CaretRight size={16} color={t.inkFaint} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { t } = useTheme();
  return <Text style={[styles.sectionLabel, { color: t.inkStrong }]}>{label}</Text>;
}

function MenuRow({
  icon: Glyph,
  iconTone,
  label,
  description,
  badge,
  divided = false,
  onPress,
}: {
  icon: Icon;
  iconTone: 'green' | 'amber' | 'blue';
  label: string;
  description: string;
  badge?: number;
  divided?: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const color = iconTone === 'amber' ? t.brandAmber : iconTone === 'blue' ? t.brandBlue : t.brandGreen;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        divided && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
        pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
      ]}
    >
      <View style={[styles.iconWell, { backgroundColor: alpha(color, 0.12) }]}>
        <Glyph size={21} color={color} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowLabel, { color: t.inkStrong }]}>{label}</Text>
        <Text style={[styles.rowDescription, { color: t.inkMuted }]} numberOfLines={2}>{description}</Text>
      </View>
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: t.brandBrickInk }]}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
      <CaretRight size={16} color={t.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { padding: 20, paddingBottom: 34 },
  intro: { marginBottom: 24 },
  introTitle: { fontFamily: sans(600), fontSize: 20, lineHeight: 25, letterSpacing: trackDisplay(20) },
  introCopy: { marginTop: 5, fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
  sectionLabel: { marginTop: 18, marginBottom: 9, fontFamily: sans(600), fontSize: 15, letterSpacing: trackDisplay(15) },
  group: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  iconWell: { width: 40, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: sans(600), fontSize: 14.5 },
  rowDescription: { marginTop: 2, fontFamily: sans(400), fontSize: 12, lineHeight: 17 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: sans(600), fontSize: 10, color: '#fff' },
  profileCard: { minHeight: 88, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  profileName: { fontFamily: sans(600), fontSize: 15 },
  profileMeta: { marginTop: 2, marginBottom: 5, fontFamily: sans(400), fontSize: 11.5 },
});
