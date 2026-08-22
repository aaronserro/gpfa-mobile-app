import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MemberNotification } from '../api/types';
import { ArrowClockwise, Bell, CheckCircle, X } from '../ds/icons';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';

export default function NotificationsSheet({
  notifications,
  loading,
  error,
  pendingIds = [],
  onMarkAllRead,
  onDismiss,
  onRetry,
  onClose,
}: {
  notifications: MemberNotification[];
  loading: boolean;
  error?: Error;
  pendingIds?: string[];
  onMarkAllRead?: () => void;
  onDismiss?: (id: string) => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const p = useRef(new Animated.Value(0)).current;
  const [height, setHeight] = useState(0);
  const unread = notifications.filter((n) => !n.read).length;
  const pending = new Set(pendingIds);
  const hasPending = pendingIds.length > 0;

  useEffect(() => {
    if (!height) return;
    const animation = Animated.timing(p, {
      toValue: 1,
      duration: 280,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [height, p]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: p }]}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close notifications" />
      </Animated.View>

      <Animated.View
        onLayout={(e) => setHeight((h) => h || e.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          {
            backgroundColor: t.surfacePaper,
            borderTopColor: t.ruleHairline,
            paddingBottom: Math.max(insets.bottom, 18),
            opacity: height ? 1 : 0,
            transform: [
              {
                translateY: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [height * 1.02, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: t.ruleHairline }]} />

        <View style={styles.head}>
          <View style={[styles.iconWrap, { backgroundColor: t.brandGreenSoft }]}>
            <Bell size={18} color={t.brandGreen} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.title, { color: t.inkStrong }]}>Notifications</Text>
            <Text style={[styles.meta, { color: t.inkMuted }]}>
              {unread ? `${unread} unread` : 'All caught up'}
            </Text>
          </View>
          {!!unread && !!onMarkAllRead && (
            <Pressable
              onPress={onMarkAllRead}
              disabled={hasPending}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
              hitSlop={8}
              style={({ pressed }) => [
                styles.markAll,
                {
                  borderColor: t.ruleHairline,
                  backgroundColor: pressed ? alpha(t.surfaceSoft, 0.6) : 'transparent',
                  opacity: hasPending ? 0.45 : 1,
                },
              ]}
            >
              <CheckCircle size={14} color={t.brandGreen} />
              <Text style={[styles.markAllText, { color: t.inkStrong }]}>Mark all</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
            style={[styles.close, { borderColor: t.ruleHairline }]}
          >
            <X size={14} color={t.inkMuted} />
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: t.ruleHairline }]} />

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={t.brandGreen} />
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Text style={[styles.stateTitle, { color: t.inkStrong }]}>Notifications unavailable</Text>
            <Text style={[styles.stateCopy, { color: t.inkMuted }]}>{error.message}</Text>
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.retry,
                {
                  borderColor: t.ruleHairline,
                  backgroundColor: pressed ? alpha(t.surfaceSoft, 0.5) : t.surfacePaper,
                },
              ]}
            >
              <ArrowClockwise size={15} color={t.brandGreen} />
              <Text style={[styles.retryText, { color: t.inkStrong }]}>Retry</Text>
            </Pressable>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.state}>
            <Text style={[styles.stateTitle, { color: t.inkStrong }]}>No notifications</Text>
            <Text style={[styles.stateCopy, { color: t.inkMuted }]}>New member activity will land here.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {notifications.map((notification) => (
              <View
                key={notification.id}
                style={[
                  styles.item,
                  {
                    backgroundColor: notification.read ? 'transparent' : alpha(t.brandGreen, 0.08),
                    borderColor: t.ruleHairline,
                  },
                ]}
              >
                <View style={styles.itemTop}>
                  {!notification.read && <View style={[styles.dot, { backgroundColor: t.brandGreen }]} />}
                  <Text style={[styles.itemTitle, { color: t.inkStrong }]}>{notification.title}</Text>
                  {!!notification.time && (
                    <Text style={[styles.time, { color: t.inkFaint }]}>{notification.time}</Text>
                  )}
                  {!!onDismiss && (
                    <Pressable
                      onPress={() => onDismiss(notification.id)}
                      disabled={pending.has(notification.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Dismiss notification"
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.dismiss,
                        {
                          borderColor: t.ruleHairline,
                          backgroundColor: pressed ? alpha(t.surfaceSoft, 0.6) : 'transparent',
                          opacity: pending.has(notification.id) ? 0.35 : 1,
                        },
                      ]}
                    >
                      <X size={12} color={t.inkMuted} />
                    </Pressable>
                  )}
                </View>
                {!!notification.body && (
                  <Text style={[styles.body, { color: t.inkMuted }]}>{notification.body}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 80 },
  scrim: { flex: 1, backgroundColor: 'rgba(19,35,41,.45)' },
  flex: { flex: 1, minWidth: 0 },

  sheet: {
    maxHeight: '76%',
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: 8 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingTop: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: sans(600), fontSize: 16, letterSpacing: trackDisplay(16) },
  meta: { marginTop: 3, fontFamily: mono(400), fontSize: 10, letterSpacing: 0.4 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAll: {
    minHeight: 32,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAllText: { fontFamily: sans(600), fontSize: 12 },
  divider: { height: 1 },

  state: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10, minHeight: 190 },
  stateTitle: { fontFamily: sans(600), fontSize: 15, textAlign: 'center' },
  stateCopy: { fontFamily: sans(400), fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  retry: {
    marginTop: 4,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: { fontFamily: sans(600), fontSize: 13 },

  list: { padding: 16, gap: 10 },
  item: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 7 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  itemTitle: { flex: 1, fontFamily: sans(600), fontSize: 13.5, lineHeight: 18 },
  time: { fontFamily: mono(400), fontSize: 10, letterSpacing: 0.4 },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { fontFamily: sans(400), fontSize: 12.5, lineHeight: 18, paddingLeft: 15 },
});