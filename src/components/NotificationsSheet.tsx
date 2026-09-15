import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MemberNotification } from '../api/types';
import { ArrowClockwise, Bell, CheckCircle, Trash } from '../ds/icons';
import { SegmentedControl } from '../ds/controls';
import { CollectionEmptyState } from '../ds/feedback';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';
import { useSheetTransition } from '../hooks/useSheetTransition';

type NotificationFilter = 'all' | 'unread';

const NOTIFICATION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
] as const;

export default function NotificationsSheet({
  notifications,
  loading,
  error,
  pendingIds = [],
  onOpen,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onDismiss,
  onRetry,
  onClose,
}: {
  notifications: MemberNotification[];
  loading: boolean;
  error?: Error;
  pendingIds?: string[];
  onOpen: (notification: MemberNotification) => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  onDismiss?: (id: string) => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const dragOffset = useRef(new Animated.Value(0)).current;
  const { closing, progress, requestClose } = useSheetTransition(onClose, height);
  const unread = notifications.filter((n) => !n.read).length;
  const visibleNotifications = filter === 'unread'
    ? notifications.filter((notification) => !notification.read)
    : notifications;
  const pending = new Set(pendingIds);
  const hasPending = pendingIds.length > 0;
  const compact = windowWidth < 420;
  const maxSheetHeight = Math.min(windowHeight * (windowWidth > windowHeight ? 0.92 : 0.82), 760);
  const dismissDistance = Math.min(Math.max(height * 0.18, 72), 140);
  const dismissGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!closing)
        .activeOffsetY(8)
        .failOffsetX([-28, 28])
        .runOnJS(true)
        .onUpdate((event) => {
          dragOffset.setValue(Math.max(0, event.translationY));
        })
        .onEnd((event) => {
          if (event.translationY >= dismissDistance || event.velocityY >= 900) {
            requestClose();
            return;
          }

          Animated.spring(dragOffset, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        })
        .onFinalize((_event, success) => {
          if (success || closing) return;
          Animated.spring(dragOffset, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        }),
    [closing, dismissDistance, dragOffset, requestClose]
  );

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          style={styles.scrim}
          onPress={() => requestClose()}
          disabled={closing}
          accessibilityRole="button"
          accessibilityLabel="Close notifications"
          accessibilityState={{ disabled: closing }}
        />
      </Animated.View>

      <Animated.View
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          {
            backgroundColor: t.surfacePaper,
            borderTopColor: t.rule,
            maxHeight: maxSheetHeight,
            paddingBottom: Math.max(insets.bottom, 18),
            opacity: height ? 1 : 0,
            transform: [
              {
                translateY: Animated.add(
                  progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height * 1.02, 0],
                  }),
                  dragOffset
                ),
              },
            ],
          },
        ]}
      >
        <GestureDetector gesture={dismissGesture}>
          <View>
            <View style={[styles.grabber, { backgroundColor: t.rule }]} />

            <View style={[styles.head, compact && styles.headCompact]}>
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
                      borderColor: t.rule,
                      backgroundColor: pressed ? alpha(t.surfaceSoft, 0.6) : 'transparent',
                      opacity: hasPending ? 0.45 : 1,
                    },
                  ]}
                >
                  <CheckCircle size={14} color={t.brandGreen} />
                  {!compact && <Text style={[styles.markAllText, { color: t.inkStrong }]}>Mark all</Text>}
                </Pressable>
              )}
              {!!notifications.length && !!onClearAll && (
                <Pressable
                  onPress={onClearAll}
                  disabled={hasPending}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all notifications"
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.clearAll,
                    {
                      backgroundColor: pressed ? alpha(t.surfaceSoft, 0.6) : 'transparent',
                      opacity: hasPending ? 0.45 : 1,
                    },
                  ]}
                >
                  <Trash size={15} color={t.inkMuted} />
                </Pressable>
              )}
            </View>
          </View>
        </GestureDetector>

        <View style={[styles.divider, { backgroundColor: t.rule }]} />

        {!loading && !error && notifications.length > 0 && (
          <SegmentedControl
            value={filter}
            options={NOTIFICATION_FILTERS}
            onChange={setFilter}
            accessibilityLabel="Filter notifications"
            style={styles.filters}
          />
        )}

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
                  borderColor: t.rule,
                  backgroundColor: pressed ? alpha(t.surfaceSoft, 0.5) : t.surfacePaper,
                },
              ]}
            >
              <ArrowClockwise size={15} color={t.brandGreen} />
              <Text style={[styles.retryText, { color: t.inkStrong }]}>Retry</Text>
            </Pressable>
          </View>
        ) : visibleNotifications.length === 0 ? (
          <CollectionEmptyState
            title={notifications.length === 0 ? 'No notifications' : 'No unread notifications'}
            body={notifications.length === 0
              ? 'New member activity will land here.'
              : 'You’re all caught up. Read notifications remain available under All.'}
            Glyph={Bell}
            compact
            style={styles.emptyState}
          />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.list, compact && styles.listCompact]}
            showsVerticalScrollIndicator={false}
          >
            {visibleNotifications.map((notification) => (
              <SwipeDismissNotification
                key={notification.id}
                disabled={pending.has(notification.id)}
                onDismiss={onDismiss ? () => onDismiss(notification.id) : undefined}
              >
                <View
                  style={[
                    styles.item,
                    {
                      backgroundColor: notification.read ? t.surfacePaper : t.brandGreenSoft,
                      borderColor: notification.read ? t.rule : alpha(t.brandGreen, 0.42),
                      borderLeftWidth: notification.read ? 1 : 3,
                      borderLeftColor: notification.read ? t.rule : t.brandGreen,
                    },
                  ]}
                >
                  <View style={styles.itemRow}>
                    <Pressable
                      onPress={() => requestClose(() => onOpen(notification))}
                      disabled={pending.has(notification.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open notification: ${notification.title}`}
                      accessibilityHint={onDismiss ? 'Swipe left or use the dismiss accessibility action to remove it' : undefined}
                      accessibilityActions={[
                        ...(!notification.read && onMarkRead
                          ? [{ name: 'markRead', label: 'Mark notification as read' }]
                          : []),
                        ...(onDismiss ? [{ name: 'dismiss', label: 'Dismiss notification' }] : []),
                      ]}
                      onAccessibilityAction={(event) => {
                        if (event.nativeEvent.actionName === 'markRead') onMarkRead?.(notification.id);
                        if (event.nativeEvent.actionName === 'dismiss') onDismiss?.(notification.id);
                      }}
                      accessibilityState={{ disabled: pending.has(notification.id) }}
                      style={({ pressed }) => [styles.itemContent, { opacity: pressed ? 0.68 : 1 }]}
                    >
                      <View style={styles.itemTop}>
                        {!notification.read && <View style={[styles.dot, { backgroundColor: t.brandGreen }]} />}
                        <Text style={[styles.itemTitle, { color: t.inkStrong }]}>{notification.title}</Text>
                      </View>
                      <View style={styles.itemMeta}>
                        {!!notification.time && (
                          <Text numberOfLines={1} style={[styles.time, { color: t.inkFaint }]}>{notification.time}</Text>
                        )}
                        {!notification.read && (
                          <View style={[styles.unreadBadge, { backgroundColor: t.surfaceAnchor }]}>
                            <Text style={[styles.unreadBadgeText, { color: t.inkInverse }]}>Unread</Text>
                          </View>
                        )}
                      </View>
                      {!!notification.body && (
                        <Text style={[styles.body, { color: t.inkMuted }]}>{notification.body}</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </SwipeDismissNotification>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function SwipeDismissNotification({
  children,
  disabled,
  onDismiss,
}: {
  children: ReactNode;
  disabled: boolean;
  onDismiss?: () => void;
}) {
  const { t } = useTheme();
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const actionOpacity = translateX.interpolate({
    inputRange: [-96, -20, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!!onDismiss && !disabled)
        // A notification must move clearly left before it competes with list scrolling.
        .activeOffsetX(-12)
        .failOffsetY([-14, 14])
        .runOnJS(true)
        .onUpdate((event) => {
          translateX.setValue(Math.max(-96, Math.min(0, event.translationX)));
        })
        .onEnd((event) => {
          if (event.translationX <= -56 || event.velocityX <= -700) {
            Animated.timing(translateX, {
              toValue: -Math.max(width, 420),
              duration: 180,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) onDismiss?.();
            });
            return;
          }

          Animated.spring(translateX, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        })
        .onFinalize((_event, success) => {
          if (success) return;
          Animated.spring(translateX, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.8,
            useNativeDriver: true,
          }).start();
        }),
    [disabled, onDismiss, translateX, width]
  );

  if (!onDismiss) return <>{children}</>;

  return (
    <View style={[styles.swipeItem, { backgroundColor: t.surfacePaper }]}>
      <Animated.View
        style={[
          styles.swipeAction,
          { backgroundColor: t.brandBrickInk, opacity: actionOpacity },
        ]}
        pointerEvents="none"
      >
        <Trash size={18} color={t.inkInverse} />
        <Text style={[styles.swipeActionLabel, { color: t.inkInverse }]}>Dismiss</Text>
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.swipeContent, { transform: [{ translateX }] }]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-end', zIndex: 80 },
  scrim: { flex: 1, backgroundColor: 'rgba(19,35,41,.45)' },
  flex: { flex: 1, minWidth: 0 },

  sheet: {
    width: '100%',
    maxWidth: 680,
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: 8 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingTop: 14 },
  headCompact: { gap: 8, paddingHorizontal: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: sans(600), fontSize: 18, letterSpacing: trackDisplay(18) },
  meta: { marginTop: 3, fontFamily: mono(400), fontSize: 11, letterSpacing: 0.4 },
  markAll: {
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAllText: { fontFamily: sans(600), fontSize: 13 },
  clearAll: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1 },
  filters: { marginHorizontal: 16, marginTop: 14 },
  emptyState: { margin: 16, minHeight: 190, justifyContent: 'center' },

  state: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10, minHeight: 190 },
  stateTitle: { fontFamily: sans(600), fontSize: 16, textAlign: 'center' },
  stateCopy: { fontFamily: sans(400), fontSize: 13.5, lineHeight: 19.5, textAlign: 'center' },
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
  retryText: { fontFamily: sans(600), fontSize: 14.5 },

  list: { padding: 16, gap: 10 },
  listCompact: { paddingHorizontal: 12 },
  swipeItem: { borderRadius: 8, overflow: 'hidden' },
  swipeContent: { width: '100%' },
  swipeAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 96,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
  },
  swipeActionLabel: { fontFamily: sans(600), fontSize: 13 },
  item: { borderWidth: 1, borderRadius: 8, padding: 14, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemContent: { flex: 1, minWidth: 0, gap: 7 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemMeta: { minHeight: 20, paddingLeft: 15, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  itemTitle: { flex: 1, minWidth: 0, fontFamily: sans(600), fontSize: 15, lineHeight: 20 },
  time: { fontFamily: mono(400), fontSize: 11, letterSpacing: 0.4 },
  unreadBadge: { borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7 },
  unreadBadgeText: { fontFamily: sans(600), fontSize: 10.5 },
  body: { fontFamily: sans(400), fontSize: 13.5, lineHeight: 19.5, paddingLeft: 15 },
});