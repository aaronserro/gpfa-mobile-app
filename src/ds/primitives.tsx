import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Image,
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
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useMember } from '../auth/MemberProvider';
import { Bell, CaretLeft, Moon, Sun } from './icons';
import { useTheme } from './ThemeProvider';
import { alpha, mono, sans, topPad, trackDisplay, HEADER_TOP } from './tokens';
import type { Relevance } from '../api/types';

import markLogo from '../../assets/logo-no-txt.png';

/* ── motion ──────────────────────────────────────────────────────────────── */

interface FadeUpProps {
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** .fade-up — 480ms, 8px rise, --fade-ease. */
export function FadeUp({ delay = 0, style, children }: FadeUpProps) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(p, {
      toValue: 1,
      duration: 480,
      delay,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [delay, p]);
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

/* ── editorial type (base.css) ───────────────────────────────────────────── */

/** .masthead-meta — mono, .04em tracking, muted. */
export function MastheadMeta({
  children,
  size = 11.5,
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
 * The one page header. Every screen and sub-screen uses it, so the back
 * control, the profile avatar and the title land at the same height on every
 * tab.
 *
 * The band is the anchor surface in both themes. The right of the top row is
 * fixed in the same order on every screen — screen `actions`, then the theme
 * toggle, the notification bell and the profile avatar. Those last three are
 * built in rather than passed, so no screen can be missing one or put them in
 * a different order. The avatar comes from `MemberProvider`, since sub-screens
 * three levels deep draw it too, and it opens the profile sheet when that
 * provider carries a handler.
 *
 * `children` are the controls that belong to the header but not on it — a
 * search field, a filter strip, a tab row. They render on the page surface
 * below the band, where the existing chip and tab contrast still works.
 *
 * The band closes with the association lockup, so the mark and the full name
 * sit under the title on every screen. It is the sign-in lockup relaid for a
 * small strip: the mark is the same art, the name is live text rather than the
 * three-line wordmark image, which is illegible below ~40px tall.
 */
export function ScreenHeader({
  title,
  accent,
  onBack,
  backLabel = 'Back',
  actions,
  children,
}: {
  title?: string;
  /** Trailing fragment recoloured to the brand accent, e.g. the '.' in 'Resources.'. */
  accent?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Screen-specific controls, drawn left of the standard three. Tint for the anchor. */
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const { t, isDark, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const { initials, openProfile } = useMember();

  return (
    <View>
      <View
        style={[
          headerStyles.band,
          {
            backgroundColor: t.surfaceAnchor,
            paddingTop: topPad(insets.top, HEADER_TOP),
          },
        ]}
      >
        <View style={headerStyles.topRow}>
          {!!onBack && (
            <Pressable onPress={onBack} accessibilityLabel={backLabel} hitSlop={8}>
              <CaretLeft size={19} color={t.brandGreenOnDark} />
            </Pressable>
          )}
          <View style={headerStyles.spacer} />
          {actions}
          <Pressable onPress={toggle} accessibilityLabel="Toggle dark mode" hitSlop={8}>
            {isDark ? <Sun size={20} color="#fff" /> : <Moon size={20} color="#fff" />}
          </Pressable>
          {/* Inert, as it has always been — see CONTRACT.md §8. Deliberately not
              a Pressable, so it isn't a tappable dead zone. */}
          <Bell size={20} color="#fff" />
          {!!initials &&
            (openProfile ? (
              <Pressable
                onPress={openProfile}
                accessibilityRole="button"
                accessibilityLabel="Your profile"
                hitSlop={6}
                style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
              >
                <Avatar initials={initials} size={32} onAnchor />
              </Pressable>
            ) : (
              <Avatar initials={initials} size={32} onAnchor />
            ))}
        </View>

        {!!title && (
          <Text style={headerStyles.title} numberOfLines={2}>
            {title}
            {!!accent && <Text style={{ color: t.brandGreenOnDark }}>{accent}</Text>}
          </Text>
        )}

        <View style={headerStyles.lockup} accessible accessibilityRole="image">
          <Image source={markLogo} style={headerStyles.mark} resizeMode="contain" />
          <Text style={[headerStyles.lockupName, { color: alpha(t.inkInverse, 0.72) }]}>
            Global Peer Financing Association
          </Text>
        </View>
      </View>

      {!!children && (
        <View
          style={[
            headerStyles.below,
            { backgroundColor: t.surfacePage, borderBottomColor: t.ruleHairline },
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  band: { paddingHorizontal: 20, paddingBottom: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 12 },
  spacer: { flex: 1 },
  title: {
    fontFamily: sans(600),
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: trackDisplay(22),
    color: '#fff',
  },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 },
  // 724×630 art, kept on ratio so the knot doesn't squash.
  mark: { width: 20, height: 17.4 },
  lockupName: {
    fontFamily: sans(500),
    fontSize: 11,
    letterSpacing: 0.2,
  },
  below: { borderBottomWidth: 1, paddingHorizontal: 20, paddingBottom: 12 },
});

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

/** .gpfa-card — 8px radius, hairline border, paper fill. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { t } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: t.radiusCard,
          backgroundColor: t.surfacePaper,
          borderWidth: 1,
          borderColor: t.border,
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
  /** Portrait to show instead of the initials. Raster only — RN's Image can't decode SVG. */
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
        <Image source={{ uri: photoUrl }} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors />
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
  /** Raster logo. RN's Image can't decode SVG, so an .svg URL renders nothing. */
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
          borderColor: t.ruleHairline,
        },
      ]}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: size * 0.77, height: size * 0.62 }}
          resizeMode="contain"
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
export function Input({ onAnchor = false, style, ...props }: InputProps) {
  const { t } = useTheme();
  return (
    <TextInput
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
}

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
  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(p, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    a.start();
    return () => a.stop();
  }, [p]);

  return (
    <View style={styles.liveWrap}>
      <Animated.View
        style={[
          styles.liveHalo,
          {
            opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
          },
        ]}
      />
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
