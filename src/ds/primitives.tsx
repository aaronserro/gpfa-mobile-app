import { forwardRef, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { BlurView } from 'expo-blur';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useMember } from '../auth/MemberProvider';
import { useReducedMotion } from '../hooks/useReducedMotion';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Bell, CaretRight, Moon, Sun } from './icons';
import type { Icon } from './icons';
import { useTheme } from './ThemeProvider';
import { alpha, headerTop, mono, sans, trackDisplay } from './tokens';
import type { Theme } from './tokens';
import type { Relevance } from '../api/types';

/* ── motion ──────────────────────────────────────────────────────────────── */

interface FadeUpProps {
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** .fade-up — 480ms, 8px rise, --fade-ease. */
export function FadeUp({ delay = 0, style, children }: FadeUpProps) {
  const p = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) {
      p.setValue(1);
      return;
    }
    const a = Animated.timing(p, {
      toValue: 1,
      duration: 480,
      delay,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [delay, p, reducedMotion]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: p, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A quick native-feeling entrance for state-driven sub-screens. */
export function ScreenEnter({ style, children }: Omit<FadeUpProps, 'delay'>) {
  const p = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      p.setValue(1);
      return;
    }
    const animation = Animated.timing(p, {
      toValue: 1,
      duration: 220,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [p, reducedMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: p,
          transform: [
            { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ── editorial type (base.css) ───────────────────────────────────────────── */

/** .masthead-meta — mono, .04em tracking, muted. */
export function MastheadMeta({
  children,
  size = 12.5,
  color,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { t } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: mono(400),
          fontSize: size,
          letterSpacing: size * 0.04,
          color: color || t.inkMuted,
          lineHeight: size * 1.5,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * .display-head — 600, -.021em tracking, 1.1 line-height. The design writes the
 * accented fragment as `<em>`, which base.css recolors to --brand-green
 * (or --brand-green-on-dark on an anchor surface) with normal font-style.
 */
export function DisplayHead({
  children,
  em,
  size = 22,
  onAnchor = false,
  style,
}: {
  children: ReactNode;
  /** The design's `<em>` fragment, recoloured to the brand accent. */
  em?: string;
  size?: number;
  onAnchor?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const { t } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: sans(600),
          fontSize: size,
          lineHeight: size * 1.1,
          letterSpacing: trackDisplay(size),
          color: onAnchor ? '#fff' : t.inkStrong,
        },
        style,
      ]}
    >
      {children}
      {!!em && <Text style={{ color: onAnchor ? t.brandGreenOnDark : t.brandGreen }}>{em}</Text>}
    </Text>
  );
}

/**
 * A drawer that slides in from the left over the screen it belongs to, with a
 * scrim behind it. Ask GPFA's conversation history uses this instead of pushing
 * a full screen: the history is a way to switch what you are reading, not a
 * place you navigate to, so the conversation stays visible behind it.
 *
 * Tapping the scrim closes it. The panel stops short of the right edge so the
 * page behind reads as still being there.
 */
export function SidePanel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTheme();
  const p = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      p.setValue(1);
      return;
    }
    const a = Animated.timing(p, {
      toValue: 1,
      duration: 250,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [p, reducedMotion]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: p }]}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close panel"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,20,22,.42)' }]}
        />
      </Animated.View>
      <Animated.View
        style={[
          sidePanelStyles.panel,
          {
            backgroundColor: t.surfacePage,
            borderRightColor: t.rule,
            transform: [
              { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-360, 0] }) },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const sidePanelStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '86%',
    maxWidth: 360,
    borderRightWidth: 1,
  },
});

/**
 * Edge swipe to go back, the gesture iOS trains people to expect. Wrap a
 * sub-screen's root in this and it gains the same affordance the back control
 * gives, so the button stops being the only way out.
 *
 * The gesture only activates from the left edge and only for clearly horizontal
 * drags, so it never competes with a vertical list or a horizontally scrolling
 * chip strip further into the page. It does not drag the screen — this is the
 * gesture, not the interactive transition.
 */
export function SwipeBack({
  onBack,
  enabled = true,
  style,
  children,
}: {
  onBack?: () => void;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!!onBack && enabled)
        // Only from the left edge, so mid-page horizontal content is untouched.
        .activeOffsetX(12)
        .failOffsetY([-14, 14])
        .hitSlop({ left: 0, width: EDGE_WIDTH })
        .onEnd((e) => {
          if (e.translationX > 64 && Math.abs(e.velocityY) < 900) {
            runOnJS(onBack ?? (() => {}))();
          }
        }),
    [enabled, onBack]
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </GestureDetector>
  );
}

/** How far in from the left edge the back gesture is picked up. */
const EDGE_WIDTH = 32;

/* ── components.css ──────────────────────────────────────────────────────── */

export type BadgeVariant = 'secondary' | 'tag-green' | 'tag-default';

export type InputProps = TextInputProps & {
  /** Applies the sign-in overrides: translucent fill, light text. */
  onAnchor?: boolean;
};

/** One layer of a CSS `radial-gradient(...)`, as percentages of the box. */
export interface Wash {
  color: string;
  /** Tint opacity at the centre — the `color-mix` percentage. */
  o: number;
  cx: string;
  cy: string;
  rx: string;
  ry: string;
  /** Offset along the ray where the tint reaches full transparency. */
  stop: string;
}

/** .gpfa-badge — h20 pill. variant: 'secondary' | 'tag-green' | 'tag-default'. */
export function Badge({
  children,
  variant = 'secondary',
  size = 12,
  style,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  const skins: Record<BadgeVariant, { bg: string; fg: string; upper: boolean }> = {
    secondary: { bg: t.secondary, fg: t.secondaryForeground, upper: false },
    'tag-green': { bg: t.brandGreenSoft, fg: t.brandGreenStrong, upper: true },
    'tag-default': { bg: t.surfaceSoft, fg: t.inkStrong, upper: true },
  };
  const skin = skins[variant];

  return (
    <View
      style={[
        {
          height: Math.max(20, size + 5),
          borderRadius: 32,
          paddingHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
          backgroundColor: skin.bg,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: sans(500),
          fontSize: size,
          color: skin.fg,
          textTransform: skin.upper ? 'uppercase' : 'none',
          letterSpacing: skin.upper ? size * 0.025 : 0,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/* ── v2 page furniture ───────────────────────────────────────────────────── */

/** The tints a section card's icon tile can take, keyed to a brand colour. */
export type Tint = 'red' | 'blue' | 'amber' | 'neutral';

const tintPair = (t: Theme, tint: Tint): { bg: string; fg: string } =>
  ({
    red: { bg: t.tintRed, fg: t.brandRed },
    blue: { bg: t.tintBlue, fg: t.brandBlue },
    amber: { bg: t.tintAmber, fg: t.brandAmber },
    neutral: { bg: t.surfaceSubtle, fg: t.inkMuted },
  })[tint];

/**
 * The 38px rounded tile a section heading leads with. Sized and tinted per v2;
 * `IconTile` at 36 is the smaller variant the Menu rows use.
 */
export function IconTile({
  Glyph,
  tint = 'neutral',
  size = 38,
}: {
  Glyph: Icon;
  tint?: Tint;
  size?: number;
}) {
  const { t } = useTheme();
  const { bg, fg } = tintPair(t, tint);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Glyph size={size >= 38 ? 19 : 17} color={fg} />
    </View>
  );
}

/**
 * A home-screen section: tinted tile, 19px heading, then the section's rows.
 * `footer` is the teal action button v2 puts under a hairline at the bottom —
 * "All events", "Browse all groups".
 */
export function SectionCard({
  title,
  Glyph,
  tint = 'neutral',
  footer,
  children,
  style,
}: {
  title: string;
  Glyph: Icon;
  tint?: Tint;
  footer?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: t.rule,
          borderRadius: t.radiusCard,
          backgroundColor: t.surfacePaper,
          padding: 16,
        },
        style,
      ]}
    >
      <View style={sectionStyles.head}>
        <IconTile Glyph={Glyph} tint={tint} />
        <Text style={[sectionStyles.title, { color: t.inkStrong }]}>{title}</Text>
      </View>
      {children}
      {!!footer && (
        <View style={[sectionStyles.footer, { borderTopColor: t.rule }]}>{footer}</View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: sans(600), fontSize: 19, letterSpacing: trackDisplay(19) },
  footer: { marginTop: 16, borderTopWidth: 1, paddingTop: 14, alignItems: 'flex-start' },
});

/**
 * The page opener above a tab's content: a 27px display head whose last phrase
 * takes the brand accent, and a lede, closed by a hairline. `em` is that
 * accented phrase, e.g. `directory.` in "Member directory."
 *
 * There is no breadcrumb. A trail like Home › Working Groups › Post is a
 * desktop affordance; on a phone the back control already says where you came
 * from, and the trail only cost a line of chrome.
 *
 * `actions` sit on the title's own line. The header band that used to carry the
 * theme toggle and the bell is gone — it existed for two icons — so this row is
 * where they live on a tab root, and the page's safe-area inset is applied
 * here rather than by a header above it.
 */
export function PageHead({
  title,
  em,
  lede,
  actions,
  onBack,
  backLabel = 'Back',
  inset = true,
  children,
}: {
  title: string;
  em?: string;
  lede?: string;
  /** Drawn at the right of the title line — `PageActions` on a tab root. */
  actions?: ReactNode;
  /**
   * Draws a back control above the title. A sub-screen that scrolls its head
   * uses this instead of a pinned bar, so its title and chrome move with the
   * page the way a tab root's do.
   */
  onBack?: () => void;
  /** Announced to screen readers; the caret stands alone visually. */
  backLabel?: string;
  /**
   * Whether to carry the safe-area top padding. True when this is the first
   * thing on the screen; false when a pinned strip above it already has.
   */
  inset?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        pageHeadStyles.wrap,
        { borderBottomColor: t.rule, paddingTop: inset ? headerTop(insets.top) : 18 },
      ]}
    >
      {!!onBack && (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={12}
          style={({ pressed }) => [
            pageHeadStyles.back,
            pressed ? { opacity: 0.7 } : null,
          ]}
        >
          <Ionicons name="chevron-back" size={26} color={t.inkStrong} />
        </Pressable>
      )}
      <View style={pageHeadStyles.titleRow}>
        <Text style={[pageHeadStyles.title, { color: t.inkStrong }]}>
          {title}
          {!!em && <Text style={{ color: t.brandGreen }}>{em}</Text>}
        </Text>
        {actions}
      </View>
      {!!lede && <Text style={[pageHeadStyles.lede, { color: t.inkMuted }]}>{lede}</Text>}
      {children}
    </View>
  );
}

const pageHeadStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 18, borderBottomWidth: 1 },
  back: { alignSelf: 'flex-start', marginBottom: 4, marginLeft: -6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: {
    flex: 1,
    fontFamily: sans(600),
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: trackDisplay(27),
  },
  lede: { marginTop: 10, fontFamily: sans(400), fontSize: 15, lineHeight: 23 },
});

/**
 * The compact bar a tab root's title animates into once its `PageHead` scrolls
 * away. Invisible at rest, so the page opens on its full 27px head; it fades
 * and slides in as that head clears the top.
 *
 * It carries its own copy of `actions` because the page head's set scrolls off
 * with it — only one of the two is ever visible, and this keeps the bell
 * reachable from anywhere in the list.
 *
 * Drive it with an `Animated.Value` fed by the pane's scroll offset. The
 * animation runs on the native driver; the only JS-side state is whether the
 * bar should accept touches yet.
 */
export function StickyTitle({
  scrollY,
  title,
  em,
  actions,
  onBack,
  backLabel = 'Back',
}: {
  scrollY: Animated.Value;
  title: string;
  em?: string;
  actions?: ReactNode;
  /** Keeps a sub-screen's way back reachable once its head has scrolled off. */
  onBack?: () => void;
  backLabel?: string;
}) {
  const { t, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const next = value > STICKY_IN;
      setStuck((current) => (current === next ? current : next));
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const range = { inputRange: [STICKY_OUT, STICKY_IN], extrapolate: 'clamp' as const };

  return (
    <AnimatedBlurView
      // Transparent to touches until it is actually on screen, so the page head
      // underneath stays tappable at rest.
      pointerEvents={stuck ? 'auto' : 'none'}
      intensity={Platform.OS === 'ios' ? 60 : 0}
      tint={isDark ? 'dark' : 'light'}
      style={[
        stickyStyles.bar,
        {
          // Opaque on Android, where the blur is not worth its cost; the bar
          // has to hide the content passing under it either way.
          backgroundColor:
            Platform.OS === 'ios' ? alpha(t.surfacePage, 0.72) : t.surfacePage,
          borderBottomColor: t.rule,
          paddingTop: headerTop(insets.top),
          opacity: scrollY.interpolate({ ...range, outputRange: [0, 1] }),
          transform: [{ translateY: scrollY.interpolate({ ...range, outputRange: [-10, 0] }) }],
        },
      ]}
    >
      {!!onBack && (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={12}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
        >
          <Ionicons name="chevron-back" size={24} color={t.inkStrong} />
        </Pressable>
      )}
      <Text style={[stickyStyles.title, { color: t.inkStrong }]} numberOfLines={1}>
        {title}
        {!!em && <Text style={{ color: t.brandGreen }}>{em}</Text>}
      </Text>
      {actions}
    </AnimatedBlurView>
  );
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/**
 * Wires a pane's scroll offset to a `StickyTitle`. Spread `handlers` onto an
 * `Animated.ScrollView` and pass `scrollY` to the bar.
 */
export function useStickyScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const handlers = useMemo(
    () => ({
      onScroll: Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
      scrollEventThrottle: 16,
    }),
    [scrollY]
  );
  return { scrollY, handlers };
}

/** Where the title starts and finishes crossing into the bar, in points of scroll. */
const STICKY_OUT = 40;
const STICKY_IN = 88;

const stickyStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    fontFamily: sans(600),
    fontSize: 19,
    letterSpacing: trackDisplay(19),
  },
});

/**
 * The theme toggle and the notification bell, for a tab root's title row.
 * These were the whole content of the old header band; with it gone they ride
 * along with the page head instead.
 */
export function PageActions({ children }: { children?: ReactNode }) {
  const { t, isDark, toggle } = useTheme();
  const { notificationUnreadCount, openNotifications } = useMember();
  const badgeLabel = notificationUnreadCount > 9 ? '9+' : String(notificationUnreadCount);

  return (
    <View style={pageActionStyles.row}>
      {children}
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel="Appearance"
        hitSlop={8}
        style={({ pressed }) => (pressed ? pageActionStyles.pressed : null)}
      >
        {isDark ? <Sun size={19} color={t.inkMuted} /> : <Moon size={19} color={t.inkMuted} />}
      </Pressable>
      <Pressable
        onPress={openNotifications}
        disabled={!openNotifications}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={8}
        style={({ pressed }) => [
          pageActionStyles.bell,
          pressed && openNotifications ? pageActionStyles.pressed : null,
        ]}
      >
        <Bell size={21} color={t.inkStrong} />
        {notificationUnreadCount > 0 && (
          <View style={[pageActionStyles.badge, { backgroundColor: t.brandBrickInk }]}>
            <Text style={pageActionStyles.badgeText}>{badgeLabel}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const pageActionStyles = StyleSheet.create({
  // Nudged down so the glyphs optically centre on the display head's cap height.
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 6 },
  bell: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontFamily: mono(600), fontSize: 9, lineHeight: 12, color: '#fff' },
  pressed: { opacity: 0.7 },
});

/**
 * v2's outline chip — 30px tall, fully rounded, hairline border. Used for
 * sector, country and membership facts. `HashChip` is the soft-filled sibling
 * that carries a post's hashtags.
 */
export function Chip({
  children,
  Glyph,
  glyphColor,
  style,
}: {
  children: ReactNode;
  Glyph?: Icon;
  glyphColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  return (
    <View style={[chipStyles.chip, { borderColor: t.rule }, style]}>
      {!!Glyph && <Glyph size={13} color={glyphColor ?? t.inkBody} />}
      <Text style={[chipStyles.label, { color: t.inkBody }]}>{children}</Text>
    </View>
  );
}

/** A post's `# tag`, on the soft fill rather than an outline. */
export function HashChip({ children }: { children: ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={[chipStyles.hash, { backgroundColor: t.surfaceSubtle }]}>
      <Text style={[chipStyles.hashLabel, { color: t.inkBody }]}># {children}</Text>
    </View>
  );
}

/**
 * A post's count control — 34px, 8px radius, mono figure. v2 uses these for
 * upvotes, replies and reposts, where the outline chips would read as facts.
 */
export function StatPill({
  Glyph,
  count,
  onPress,
  accessibilityLabel,
}: {
  Glyph: Icon;
  count: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { t } = useTheme();
  const body = (
    <>
      <Glyph size={14} color={t.inkBody} />
      <Text style={[chipStyles.statLabel, { color: t.inkBody }]}>{count}</Text>
    </>
  );
  if (!onPress) {
    return <View style={[chipStyles.stat, { borderColor: t.rule }]}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        chipStyles.stat,
        { borderColor: t.rule },
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      {body}
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 32,
    borderWidth: 1,
  },
  label: { fontFamily: sans(400), fontSize: 13 },
  hash: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 32,
    justifyContent: 'center',
  },
  hashLabel: { fontFamily: sans(400), fontSize: 13.5 },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statLabel: { fontFamily: mono(400), fontSize: 13 },
});

/**
 * The anchor-teal action button — 40px in a card footer, 44px when it is the
 * page's own primary. `variant="outline"` is the paired secondary.
 */
export function ActionButton({
  label,
  onPress,
  Glyph,
  variant = 'primary',
  size = 40,
  style,
}: {
  label: string;
  onPress?: () => void;
  Glyph?: Icon;
  variant?: 'primary' | 'outline';
  size?: 40 | 44;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: alpha(primary ? '#ffffff' : t.inkStrong, 0.16) }}
      style={({ pressed }) => [
        buttonStyles.button,
        {
          height: size,
          backgroundColor: primary ? t.surfaceAnchor : 'transparent',
          borderWidth: primary ? 0 : 1,
          borderColor: t.rule,
        },
        pressed && Platform.OS !== 'android'
          ? { backgroundColor: primary ? t.surfaceAnchorSoft : t.surfaceSubtle }
          : null,
        style,
      ]}
    >
      {!!Glyph && <Glyph size={16} color={primary ? '#fff' : t.inkStrong} />}
      <Text
        style={[
          buttonStyles.label,
          { fontFamily: sans(primary ? 600 : 500), color: primary ? '#fff' : t.inkStrong },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 15 },
});

/**
 * v2's 52×31 switch. RN's own `Switch` can't be driven to the design's track
 * and knob sizes, so this is the drawn equivalent — anchor teal when on, the
 * strong rule when off.
 */
export function Toggle({
  value,
  onValueChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Announced to screen readers; the visible copy sits beside the switch. */
  label: string;
  disabled?: boolean;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        toggleStyles.track,
        {
          backgroundColor: value ? t.surfaceAnchor : t.ruleStrong,
          justifyContent: value ? 'flex-end' : 'flex-start',
        },
        disabled ? { opacity: 0.5 } : null,
        pressed && !disabled ? { opacity: 0.8 } : null,
      ]}
    >
      <View style={toggleStyles.knob} />
    </Pressable>
  );
}

const toggleStyles = StyleSheet.create({
  track: {
    width: 52,
    height: 31,
    borderRadius: 16,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  knob: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

/**
 * A Menu row: 36px tile, label, trailing caret. `value` replaces the caret
 * when the row reports a setting rather than navigating — Appearance shows
 * "Light" / "Dark" that way.
 */
export function MenuRow({
  label,
  Glyph,
  onPress,
  value,
  first = false,
}: {
  label: string;
  Glyph: Icon;
  onPress?: () => void;
  value?: string;
  /** Suppresses the top hairline on the first row of a group. */
  first?: boolean;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: alpha(t.inkStrong, 0.1) }}
      style={({ pressed }) => [
        menuRowStyles.row,
        { borderTopWidth: first ? 0 : 1, borderTopColor: t.rule },
        // iOS has no ripple, so it takes the soft fill instead of a fade —
        // a row that dims reads as disabled rather than pressed.
        pressed && Platform.OS !== 'android' ? { backgroundColor: t.surfaceSubtle } : null,
      ]}
    >
      <IconTile Glyph={Glyph} size={36} />
      <Text style={[menuRowStyles.label, { color: t.inkStrong }]}>{label}</Text>
      {value ? (
        <Text style={[menuRowStyles.value, { color: t.inkMuted }]}>{value}</Text>
      ) : (
        <CaretRight size={15} color={t.ruleStrong} />
      )}
    </Pressable>
  );
}

const menuRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  label: { flex: 1, fontFamily: sans(500), fontSize: 16 },
  value: { fontFamily: sans(400), fontSize: 14 },
});

/** The uppercase group label above a Menu section. */
export function GroupLabel({ children }: { children: ReactNode }) {
  const { t } = useTheme();
  return (
    <Text
      style={{
        fontFamily: sans(600),
        fontSize: 12,
        letterSpacing: 2.16,
        textTransform: 'uppercase',
        color: t.inkFaint,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

/** .gpfa-card — 12px radius, hairline border, paper fill. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { t } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: t.radiusCard,
          backgroundColor: t.surfacePaper,
          borderWidth: 1,
          borderColor: t.rule,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** .gpfa-avatar + __fallback — round, inset hairline ring, muted fill. */
export function Avatar({
  initials,
  photoUrl,
  size = 32,
  onAnchor = false,
  style,
}: {
  initials: string;
  /** Portrait to show instead of the initials. */
  photoUrl?: string;
  size?: number;
  /** Anchor-surface override: translucent fill and light text, for the header. */
  onAnchor?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTheme();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: onAnchor ? alpha(t.inkInverse, 0.16) : t.muted,
          borderWidth: 1,
          borderColor: onAnchor ? t.ruleOnAnchor : t.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {photoUrl ? (
        <ExpoImage
          source={photoUrl}
          style={styles.fill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={160}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          style={{
            fontFamily: sans(600),
            fontSize: size <= 24 ? 9 : 12,
            color: onAnchor ? '#fff' : t.mutedForeground,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

/**
 * An organization's mark — squared off so it never reads as a person the way
 * the round `Avatar` does. Falls back to initials when there is no logo.
 */
export function OrgMark({
  initials,
  logoUrl,
  size = 36,
}: {
  initials: string;
  /** Organization logo, including supported SVG sources. */
  logoUrl?: string;
  size?: number;
}) {
  const { t } = useTheme();
  return (
    <View
      style={[
        styles.orgMark,
        {
          width: size,
          height: size,
          // A logo sits on paper so its own colours read; initials take the soft fill.
          backgroundColor: logoUrl ? t.surfacePaper : t.surfaceSoft,
          borderColor: t.rule,
        },
      ]}
    >
      {logoUrl ? (
        <ExpoImage
          source={logoUrl}
          style={{ width: size * 0.77, height: size * 0.62 }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={160}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={[styles.orgMarkText, { fontSize: size >= 40 ? 13 : 12, color: t.inkMuted }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

/** .gpfa-input. `onAnchor` applies the sign-in overrides (translucent fill, light text). */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { onAnchor = false, style, ...props },
  ref
) {
  const { t } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={onAnchor ? alpha(t.inkInverse, 0.55) : t.mutedForeground}
      style={[
        {
          borderRadius: 8,
          borderWidth: 1,
          borderColor: onAnchor ? t.ruleOnAnchor : t.input,
          backgroundColor: onAnchor ? 'rgba(255,255,255,.06)' : t.surfacePaper,
          paddingHorizontal: 10,
          fontFamily: sans(400),
          fontSize: 14,
          color: onAnchor ? '#fff' : t.inkStrong,
        },
        style,
      ]}
      {...props}
    />
  );
});

/** .relevance-dot — high carries a 3px translucent ring. */
export function RelevanceDot({ level, style }: { level: Relevance; style?: StyleProp<ViewStyle> }) {
  const { t } = useTheme();
  const fills: Record<Relevance, string> = { high: t.brandGreen, medium: '#d6a64b', low: t.inkFaint };
  const fill = fills[level];
  return (
    <View
      style={[
        {
          width: 8.8,
          height: 8.8,
          borderRadius: 4.4,
          backgroundColor: fill,
        },
        level === 'high' && {
          borderWidth: 3,
          borderColor: alpha(t.brandGreen, 0.15),
          width: 14.8,
          height: 14.8,
          borderRadius: 7.4,
          marginLeft: -3,
        },
        style,
      ]}
    />
  );
}

/** .live-dot — 1.8s expanding halo behind a static red dot. */
export function LiveDot() {
  const p = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) {
      p.setValue(0);
      return;
    }
    const a = Animated.loop(
      Animated.timing(p, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    a.start();
    return () => a.stop();
  }, [p, reducedMotion]);

  return (
    <View style={styles.liveWrap}>
      {!reducedMotion && (
        <Animated.View
          style={[
            styles.liveHalo,
            {
              opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
              transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
            },
          ]}
        />
      )}
      <View style={styles.liveDot} />
    </View>
  );
}

/**
 * Approximates the design's layered `radial-gradient(...)` background images.
 * expo-linear-gradient is linear-only, so these are drawn as SVG radial
 * gradients — one <Rect> per wash, stacked.
 *
 * Each wash: { color, o } tint, `cx`/`cy` center and `rx`/`ry` extent as CSS
 * percentages, and `stop` where it reaches full transparency.
 */
export function RadialWash({ washes, style }: { washes: Wash[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {washes.map((w, i) => (
            <RadialGradient key={i} id={`w${i}`} cx={w.cx} cy={w.cy} rx={w.rx} ry={w.ry} gradientUnits="objectBoundingBox">
              <Stop offset="0" stopColor={w.color} stopOpacity={w.o} />
              <Stop offset={w.stop} stopColor={w.color} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>
        {washes.map((_w, i) => (
          <Rect key={i} x="0" y="0" width="100%" height="100%" fill={`url(#w${i})`} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  orgMark: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orgMarkText: { fontFamily: sans(600) },

  liveWrap: {
    width: 7.2,
    height: 7.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 7.2,
    height: 7.2,
    borderRadius: 3.6,
    backgroundColor: '#b8453a',
  },
  liveHalo: {
    position: 'absolute',
    width: 11.2,
    height: 11.2,
    borderRadius: 5.6,
    backgroundColor: '#b8453a',
  },
});
