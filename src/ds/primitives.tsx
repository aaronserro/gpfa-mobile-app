import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from './ThemeProvider';
import { alpha, mono, sans, trackDisplay, trackEyebrow } from './tokens';
import type { Relevance } from '../data/portal';

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

/** .eyebrow — uppercase, 600, .18em tracking. `onAnchor` applies the anchor-surface override. */
export function Eyebrow({
  children,
  size = 11.5,
  onAnchor = false,
  style,
}: {
  children: ReactNode;
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
          letterSpacing: trackEyebrow(size),
          textTransform: 'uppercase',
          color: onAnchor ? alpha(t.inkInverse, 0.7) : t.inkMuted,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

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
  size = 32,
  style,
}: {
  initials: string;
  size?: number;
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
          backgroundColor: t.muted,
          borderWidth: 1,
          borderColor: t.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: sans(600), fontSize: size <= 24 ? 9 : 12, color: t.mutedForeground }}>
        {initials}
      </Text>
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
