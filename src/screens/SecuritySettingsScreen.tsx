import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans, trackDisplay } from '../ds/tokens';

export default function SecuritySettingsScreen({
  mentionHandle,
  onBack,
  onSaveHandle,
  onRequestPasswordChange,
}: {
  mentionHandle: string;
  onBack: () => void;
  onSaveHandle: (value: string) => Promise<void>;
  onRequestPasswordChange: () => Promise<void>;
}) {
  const { t } = useTheme();
  const [handle, setHandle] = useState(mentionHandle);
  const [pending, setPending] = useState<'handle' | 'password' | null>(null);

  useEffect(() => setHandle(mentionHandle), [mentionHandle]);

  const saveHandle = async () => {
    setPending('handle');
    try {
      await onSaveHandle(handle.trim());
      Alert.alert('Handle updated', 'Your new mention handle is active.');
    } catch (error) {
      Alert.alert('Could not update handle', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPending(null);
    }
  };

  const requestPassword = async () => {
    setPending('password');
    try {
      await onRequestPasswordChange();
      Alert.alert('Check your email', 'A secure password-change link has been sent to your account email.');
    } catch (error) {
      Alert.alert('Could not send link', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="Security & identity" onBack={onBack} backLabel="Back to account" />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={[styles.heading, { color: t.inkStrong }]}>Mention handle</Text>
        <Text style={[styles.description, { color: t.inkMuted }]}>Members use this public handle to mention you in discussions.</Text>
        <View style={styles.handleRow}>
          <Text style={[styles.at, { color: t.inkMuted }]}>@</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            value={handle}
            onChangeText={setHandle}
            style={[styles.input, styles.flex, { color: t.inkStrong, backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}
          />
        </View>
        <ActionButton
          label={pending === 'handle' ? 'Saving…' : 'Save handle'}
          pending={pending === 'handle'}
          disabled={pending !== null || handle.trim() === mentionHandle}
          onPress={() => void saveHandle()}
        />

        <View style={[styles.divider, { backgroundColor: t.ruleHairline }]} />
        <Text style={[styles.heading, { color: t.inkStrong }]}>Password</Text>
        <Text style={[styles.description, { color: t.inkMuted }]}>For security, password changes are completed through a verified email link.</Text>
        <ActionButton
          label={pending === 'password' ? 'Sending…' : 'Email password-change link'}
          pending={pending === 'password'}
          disabled={pending !== null}
          onPress={() => void requestPassword()}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ActionButton({ label, pending, disabled, onPress }: { label: string; pending: boolean; disabled: boolean; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: t.brandGreen, opacity: disabled ? 0.5 : pressed ? 0.82 : 1 }]}
    >
      {pending && <ActivityIndicator size="small" color="#fff" />}
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  description: { marginTop: 5, marginBottom: 14, fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  at: { fontFamily: sans(600), fontSize: 18 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontFamily: sans(400), fontSize: 15 },
  button: { minHeight: 48, borderRadius: 8, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { color: '#fff', fontFamily: sans(600), fontSize: 14.5 },
  divider: { height: 1, marginVertical: 28 },
});
