import { ActivityIndicator, Animated, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { PushNotificationsState } from '../api/types';
import { PageActions, PageHead, StickyTitle, useStickyScroll } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans, trackDisplay } from '../ds/tokens';

const DESCRIPTION: Record<PushNotificationsState, string> = {
  disabled: 'Updates are not being sent to this device.',
  enabled: 'Member updates can appear when the app is closed or in the background.',
  requestable: 'Turn this on to choose whether GPFA may send notifications.',
  blocked: 'Notifications are blocked in your device settings.',
  unavailable: 'Push notifications require a configured member API and a native iOS or Android build.',
};

export default function PushNotificationsScreen({
  state,
  pending,
  error,
  onBack,
  onEnable,
  onDisable,
  onOpenSettings,
  onRetry,
}: {
  state: PushNotificationsState;
  pending: boolean;
  error: Error | null;
  onBack: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onOpenSettings: () => void;
  onRetry: () => void;
}) {
  const { t } = useTheme();
  const { scrollY, handlers } = useStickyScroll();
  const unavailable = state === 'unavailable';

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <StickyTitle scrollY={scrollY} title="Push notifications" onBack={onBack} backLabel="Back to account" actions={<PageActions />} />
      <Animated.ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} {...handlers}>
        <PageHead title="Push notifications" onBack={onBack} backLabel="Back to account" actions={<PageActions />} />
        <Text style={[styles.intro, { color: t.inkMuted }]}>Receive the same durable member updates shown in the notification centre. This setting applies only to this device.</Text>

        <View style={[styles.group, { backgroundColor: t.surfacePaper, borderColor: t.rule }]}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: t.inkStrong }]}>Notifications on this device</Text>
              <Text style={[styles.description, { color: t.inkMuted }]}>{DESCRIPTION[state]}</Text>
            </View>
            {pending ? (
              <ActivityIndicator accessibilityLabel="Updating push notifications" color={t.brandGreen} />
            ) : (
              <Switch
                accessibilityLabel="Notifications on this device"
                accessibilityHint={DESCRIPTION[state]}
                disabled={unavailable}
                value={state === 'enabled'}
                onValueChange={(enabled) => enabled ? onEnable() : onDisable()}
                trackColor={{ false: t.muted, true: t.brandGreen }}
              />
            )}
          </View>
        </View>

        {state === 'blocked' && (
          <ActionButton label="Open device settings" onPress={onOpenSettings} />
        )}

        {error && (
          <View
            accessibilityRole="alert"
            style={[styles.notice, { backgroundColor: alpha(t.brandRed, 0.08), borderColor: alpha(t.brandRed, 0.3) }]}
          >
            <Text style={[styles.noticeTitle, { color: t.brandRed }]}>Could not update notifications</Text>
            <Text style={[styles.noticeBody, { color: t.inkMuted }]}>{error.message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [
                styles.retry,
                { borderColor: t.ruleStrong, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[styles.retryText, { color: t.inkStrong }]}>Try again</Text>
            </Pressable>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: t.brandGreen, opacity: pressed ? 0.82 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: t.primaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: { marginBottom: 16, fontFamily: sans(400), fontSize: 14.5, lineHeight: 21 },
  group: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { minHeight: 84, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  description: { marginTop: 3, fontFamily: sans(400), fontSize: 13, lineHeight: 18.5 },
  button: { minHeight: 48, marginTop: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: sans(600), fontSize: 16 },
  notice: { marginTop: 16, borderWidth: 1, borderRadius: 12, padding: 14 },
  noticeTitle: { fontFamily: sans(600), fontSize: 15 },
  noticeBody: { marginTop: 4, fontFamily: sans(400), fontSize: 13.5, lineHeight: 19.5 },
  retry: { alignSelf: 'flex-start', minHeight: 40, marginTop: 12, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: sans(600), fontSize: 14.5 },
});
