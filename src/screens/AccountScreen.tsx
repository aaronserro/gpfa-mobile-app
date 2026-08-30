import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ArrowFatUp, ArrowSquareOut, At, Bell, CaretRight, CheckCircle, Desktop, LockSimple, Moon, PencilSimple, Sun, User } from '../ds/icons';
import { Avatar, ScreenHeader } from '../ds/primitives';
import { useTheme, type ThemePreference } from '../ds/ThemeProvider';
import { alpha, sans, trackDisplay } from '../ds/tokens';
import { initials as initialsOf } from '../lib/format';
import type { Member } from '../api/types';

export default function AccountScreen({
  member,
  themePreference,
  signingOut,
  onBack,
  onOpenProfile,
  onEditProfile,
  onOpenEmailPreferences,
  onOpenMentions,
  onOpenUpvotes,
  onOpenSecurity,
  onThemeChange,
  onSignOut,
}: {
  member: Member;
  themePreference: ThemePreference;
  signingOut: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
  onEditProfile: () => void;
  onOpenEmailPreferences: () => void;
  onOpenMentions: () => void;
  onOpenUpvotes: () => void;
  onOpenSecurity: () => void;
  onThemeChange: (preference: ThemePreference) => void;
  onSignOut: () => void;
}) {
  const { t } = useTheme();

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="Account" onBack={onBack} backLabel="Back to more" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.identity, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          <Avatar initials={member.initials ?? initialsOf(member.name)} photoUrl={member.avatarUrl ?? undefined} size={48} />
          <View style={styles.flex}>
            <Text style={[styles.name, { color: t.inkStrong }]}>{member.name}</Text>
            <Text numberOfLines={1} style={[styles.meta, { color: t.inkMuted }]}>
              {[member.org, member.role].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        <SectionLabel label="Account" />
        <View style={[styles.group, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          <ActionRow
            icon={<User size={19} color={t.brandGreen} />}
            label="View profile"
            description="Member details, organization and reposts"
            onPress={onOpenProfile}
          />
          <ActionRow
            icon={<PencilSimple size={19} color={t.brandGreen} />}
            label="Edit profile"
            description="Name, role, country, biography and skills"
            divided
            onPress={onEditProfile}
          />
          <ActionRow
            icon={<Bell size={19} color={t.brandGreen} />}
            label="Email preferences"
            description="Choose which member updates reach your inbox"
            divided
            onPress={onOpenEmailPreferences}
          />
          <ActionRow
            icon={<At size={19} color={t.brandGreen} />}
            label="Mention history"
            description="Working-group posts and replies that mentioned you"
            divided
            onPress={onOpenMentions}
          />
          <ActionRow
            icon={<ArrowFatUp size={19} color={t.brandGreen} />}
            label="Upvote history"
            description="Member contributions you have supported"
            divided
            onPress={onOpenUpvotes}
          />
          <ActionRow
            icon={<LockSimple size={19} color={t.brandGreen} />}
            label="Security & identity"
            description="Mention handle and password-change request"
            divided
            onPress={onOpenSecurity}
          />
          <View style={[styles.row, styles.divided, { borderTopColor: t.ruleHairline }]}>
            <CheckCircle size={19} color={t.brandGreen} />
            <View style={styles.flex}>
              <Text style={[styles.rowLabel, { color: t.inkStrong }]}>Active on this device</Text>
              <Text style={[styles.rowDescription, { color: t.inkMuted }]}>Session renews securely when needed</Text>
            </View>
          </View>
        </View>

        <SectionLabel label="Appearance" />
        <View style={[styles.group, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          <ThemeRow
            icon={<Sun size={19} color={t.brandAmber} />}
            label="Light"
            selected={themePreference === 'light'}
            onPress={() => onThemeChange('light')}
          />
          <ThemeRow
            icon={<Moon size={19} color={t.brandBlue} />}
            label="Dark"
            selected={themePreference === 'dark'}
            divided
            onPress={() => onThemeChange('dark')}
          />
          <ThemeRow
            icon={<Desktop size={19} color={t.brandGreen} />}
            label="System"
            selected={themePreference === 'system'}
            divided
            onPress={() => onThemeChange('system')}
          />
        </View>

        <SectionLabel label="Session" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out of this device"
          disabled={signingOut}
          onPress={onSignOut}
          style={({ pressed }) => [
            styles.signOut,
            {
              backgroundColor: pressed ? alpha(t.brandRed, 0.1) : t.surfacePaper,
              borderColor: t.ruleHairline,
              opacity: signingOut ? 0.65 : 1,
            },
          ]}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={t.brandRed} />
          ) : (
            <ArrowSquareOut size={19} color={t.brandRed} />
          )}
          <View style={styles.flex}>
            <Text style={[styles.rowLabel, { color: t.brandRed }]}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Text>
            <Text style={[styles.rowDescription, { color: t.inkMuted }]}>Revoke this device's session</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { t } = useTheme();
  return <Text style={[styles.sectionLabel, { color: t.inkStrong }]}>{label}</Text>;
}

function ActionRow({
  icon,
  label,
  description,
  onPress,
  divided = false,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
  divided?: boolean;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divided && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
        pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
      ]}
    >
      {icon}
      <View style={styles.flex}>
        <Text style={[styles.rowLabel, { color: t.inkStrong }]}>{label}</Text>
        <Text style={[styles.rowDescription, { color: t.inkMuted }]}>{description}</Text>
      </View>
      <CaretRight size={15} color={t.inkFaint} />
    </Pressable>
  );
}

function ThemeRow({
  icon,
  label,
  selected,
  divided = false,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  divided?: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.themeRow,
        divided && { borderTopWidth: 1, borderTopColor: t.ruleHairline },
        pressed && { backgroundColor: alpha(t.surfaceSoft, 0.48) },
      ]}
    >
      {icon}
      <Text style={[styles.rowLabel, styles.flex, { color: t.inkStrong }]}>{label}</Text>
      <View style={[styles.radio, { borderColor: selected ? t.brandGreen : t.ruleStrong }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: t.brandGreen }]} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { padding: 20, paddingBottom: 36 },
  identity: { minHeight: 82, borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  meta: { marginTop: 3, fontFamily: sans(400), fontSize: 12.5 },
  sectionLabel: { marginTop: 22, marginBottom: 9, fontFamily: sans(600), fontSize: 15, letterSpacing: trackDisplay(15) },
  group: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  row: { minHeight: 68, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divided: { borderTopWidth: 1 },
  rowLabel: { fontFamily: sans(600), fontSize: 14.5 },
  rowDescription: { marginTop: 2, fontFamily: sans(400), fontSize: 12, lineHeight: 17 },
  themeRow: { minHeight: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  signOut: { minHeight: 68, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
});