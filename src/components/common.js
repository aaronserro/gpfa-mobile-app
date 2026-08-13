import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, G, Path, Pattern, Rect } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Mirrors the design's `cardIn` / `screenIn` keyframes: fade up from a small
 * offset, optionally after a stagger delay.
 */
export function FadeIn({ delay = 0, offset = 10, duration = 450, style, children }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(p, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, duration, p]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: p,
          transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** The design's `popIn`: scale up from 0.94 while fading in. */
export function PopIn({ delay = 0, duration = 500, style, children }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(p, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, duration, p]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: p,
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** GPFA mark — three overlapping ellipses at 0°/60°/120°. */
export function Logo({ size = 44, stroke = colors.green, strokeWidth = 1.6, spin = false }) {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spin) return undefined;
    const anim = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [spin, rot]);

  const mark = (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <G stroke={stroke} strokeWidth={strokeWidth} fill="none">
        <Ellipse cx="22" cy="22" rx="17" ry="6.5" />
        <Ellipse cx="22" cy="22" rx="17" ry="6.5" transform="rotate(60 22 22)" />
        <Ellipse cx="22" cy="22" rx="17" ry="6.5" transform="rotate(120 22 22)" />
      </G>
    </Svg>
  );

  if (!spin) return mark;

  return (
    <Animated.View
      style={{
        transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    >
      {mark}
    </Animated.View>
  );
}

/**
 * Stand-in for the design's `repeating-linear-gradient` cover art, which has no
 * RN equivalent — drawn as an SVG pattern instead.
 */
export function DiagonalStripes({ height, radius = 0 }) {
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <Svg width="100%" height={height}>
        <Defs>
          <Pattern id="stripes" patternUnits="userSpaceOnUse" width="22.6" height="22.6" patternTransform="rotate(45)">
            <Rect x="0" y="0" width="11.3" height="22.6" fill="rgba(169,217,164,0.07)" />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height={height} fill={colors.band} />
        <Rect x="0" y="0" width="100%" height={height} fill="url(#stripes)" />
      </Svg>
    </View>
  );
}

export function BellIcon({ size = 20, color = colors.sub }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <Path d="M13.7 20a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}
