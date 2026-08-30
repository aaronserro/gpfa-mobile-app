import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MemberNotification } from '../api/types';
import { Bell, X } from '../ds/icons';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans } from '../ds/tokens';

const DISPLAY_MS = 6500;

export default function NotificationArrivalBanner({
  notification,
  onOpen,
  onDismiss,
}: {
  notification: MemberNotification | null;
  onOpen: (notification: MemberNotification) => void;
  onDismiss: () => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(onDismiss, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <View style={[styles.position, { top: Math.max(insets.top, 10) + 8 }]} pointerEvents="box-none">
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.banner,
          {
            backgroundColor: t.surfacePaper,
            borderColor: alpha(t.brandGreen, 0.42),
            shadowColor: t.inkStrong,
          },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: t.brandGreenSoft }]}>
          <Bell size={17} color={t.brandGreen} weight="fill" />
        </View>
        <Pressable
          style={styles.content}
          onPress={() => onOpen(notification)}
          accessibilityRole="button"
          accessibilityLabel={`Open notification: ${notification.title}`}
        >
          <Text style={[styles.label, { color: t.brandGreen }]}>New notification</Text>
          <Text numberOfLines={1} style={[styles.title, { color: t.inkStrong }]}>
            {notification.title}
          </Text>
          {!!notification.body && (
            <Text numberOfLines={2} style={[styles.body, { color: t.inkMuted }]}>
              {notification.body}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification banner"
          hitSlop={8}
          style={styles.close}
        >
          <X size={15} color={t.inkMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', left: 12, right: 12, zIndex: 120 },
  banner: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0 },
  label: { fontFamily: mono(500), fontSize: 9.5, letterSpacing: 0.3, marginBottom: 3 },
  title: { fontFamily: sans(600), fontSize: 13.5, lineHeight: 18 },
  body: { marginTop: 2, fontFamily: sans(400), fontSize: 12, lineHeight: 17 },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
});
