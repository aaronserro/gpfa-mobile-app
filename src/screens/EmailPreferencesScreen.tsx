import { Alert, Animated, StyleSheet, Switch, Text, View } from 'react-native';

import type { MemberEmailPreferenceKey, MemberEmailPreferences } from '../api/types';
import { PageActions, PageHead, StickyTitle, useStickyScroll } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans, trackDisplay } from '../ds/tokens';

const OPTIONS: Array<{
  key: MemberEmailPreferenceKey;
  label: string;
  description: string;
}> = [
  { key: 'workingGroupPosts', label: 'Working group activity', description: 'Posts and discussions from your groups.' },
  { key: 'siteEvents', label: 'Events', description: 'Invitations, reminders and event updates.' },
  { key: 'siteAnnouncements', label: 'Announcements', description: 'Important GPFA member announcements.' },
  { key: 'surveyEmails', label: 'Surveys', description: 'Requests to contribute to member research.' },
  { key: 'marketingCampaigns', label: 'GPFA updates', description: 'Editorial and program updates from GPFA.' },
];

export default function EmailPreferencesScreen({
  preferences,
  pending,
  onBack,
  onChange,
}: {
  preferences: MemberEmailPreferences;
  pending: MemberEmailPreferenceKey | null;
  onBack: () => void;
  onChange: (key: MemberEmailPreferenceKey, enabled: boolean) => Promise<void>;
}) {
  const { t } = useTheme();
  const { scrollY, handlers } = useStickyScroll();

  const change = async (key: MemberEmailPreferenceKey, enabled: boolean) => {
    try {
      await onChange(key, enabled);
    } catch (error) {
      Alert.alert('Could not update preference', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <StickyTitle scrollY={scrollY} title="Email preferences" onBack={onBack} backLabel="Back to account" actions={<PageActions />} />
      <Animated.ScrollView contentContainerStyle={styles.scroll} {...handlers}>
        <PageHead title="Email preferences" onBack={onBack} backLabel="Back to account" actions={<PageActions />} />
        <Text style={[styles.intro, { color: t.inkMuted }]}>Choose which member emails you receive. Essential account and security messages are always sent.</Text>
        <View style={[styles.group, { backgroundColor: t.surfacePaper, borderColor: t.rule }]}>
          {OPTIONS.map((option, index) => (
            <View
              key={option.key}
              style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: t.rule }]}
            >
              <View style={styles.flex}>
                <Text style={[styles.label, { color: t.inkStrong }]}>{option.label}</Text>
                <Text style={[styles.description, { color: t.inkMuted }]}>{option.description}</Text>
              </View>
              <Switch
                accessibilityLabel={option.label}
                disabled={pending !== null}
                value={preferences[option.key]}
                onValueChange={(enabled) => void change(option.key, enabled)}
                trackColor={{ false: t.muted, true: t.brandGreen }}
              />
            </View>
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: { fontFamily: sans(400), fontSize: 14.5, lineHeight: 21, marginBottom: 16 },
  group: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { minHeight: 76, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  description: { marginTop: 3, fontFamily: sans(400), fontSize: 13, lineHeight: 18.5 },
});
