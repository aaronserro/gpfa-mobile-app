import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { MemberEmailPreferenceKey, MemberEmailPreferences } from '../api/types';
import { ScreenHeader } from '../ds/primitives';
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

  const change = async (key: MemberEmailPreferenceKey, enabled: boolean) => {
    try {
      await onChange(key, enabled);
    } catch (error) {
      Alert.alert('Could not update preference', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="Email preferences" onBack={onBack} backLabel="Back to account" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: t.inkMuted }]}>Choose which member emails you receive. Essential account and security messages are always sent.</Text>
        <View style={[styles.group, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
          {OPTIONS.map((option, index) => (
            <View
              key={option.key}
              style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline }]}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: { fontFamily: sans(400), fontSize: 13, lineHeight: 19, marginBottom: 16 },
  group: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  row: { minHeight: 76, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontFamily: sans(600), fontSize: 14.5, letterSpacing: trackDisplay(14.5) },
  description: { marginTop: 3, fontFamily: sans(400), fontSize: 12, lineHeight: 17 },
});
