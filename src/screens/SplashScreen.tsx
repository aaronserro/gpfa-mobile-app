/**
 * The launch screen, from the GPFA App Splash design.
 *
 * Presentational and self-contained: it takes no props, reads no data, and does
 * not use `useTheme` — the splash is the same dark scene in both themes, and it
 * paints before the auth session (and therefore the member's theme) is known.
 *
 * The design layers, back to front: the Earth photograph filling the lower
 * three-quarters, a gradient dissolving its top edge into the ground colour, a
 * breathing radial shadow behind the mark, the copy and the mark, then a
 * gradient sitting the progress bar off the photo.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '../hooks/useReducedMotion';

import backdrop from '../../assets/splash-backdrop.jpg';
import mark from '../../assets/logo-no-txt.png';

/** The ground colour. Also the app.json splash background, so the handoff is seamless. */
export const SPLASH_BACKGROUND = '#050810';

/** A looping driver, 0 → 1 over `duration`. */
function useLoop(duration: number, enabled: boolean) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) {
      p.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.timing(p, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    animation.start();
    return () => animation.stop();
  }, [duration, enabled, p]);
  return p;
}

/** `gpfaRise` — 16px up and in, on a delay. */
function Rise({ delay, children }: { delay: number; children: React.ReactNode }) {
  const p = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      p.setValue(1);
      return;
    }
    const animation = Animated.timing(p, {
      toValue: 1,
      duration: 1000,
      delay,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, p, reducedMotion]);

  return (
    <Animated.View
      style={{
        opacity: p,
        transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const animated = !reducedMotion;

  // The design's four loops. Each keeps its own period so they drift apart
  // rather than pulsing in lockstep.
  const glow = useLoop(6000, animated);
  const breathe = useLoop(5200, animated);
  const halo = useLoop(7000, animated);
  const drift = useLoop(64000, animated);
  const bar = useLoop(2000, animated);

  // A triangle wave, for the loops that ease out and back rather than resetting.
  const pingPong = (v: Animated.Value) =>
    v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });

  return (
    <View style={styles.root}>
      {/* The photograph, and the gradient that dissolves its top edge.
          `splash-backdrop.jpg` ships @2x and @3x beside it, so Metro hands the
          device the density it actually draws at. `resizeMethod="scale"` stops
          Android prescaling the bitmap down before it composites, which is what
          the default does to an image this size and it shows. */}
      <Image
        source={backdrop}
        style={styles.backdrop}
        resizeMode="cover"
        resizeMethod="scale"
      />
      <LinearGradient
        colors={[SPLASH_BACKGROUND, 'rgba(5,8,16,0.65)', 'rgba(5,8,16,0)']}
        locations={[0, 0.55, 1]}
        style={[styles.backdropFade, { bottom: '56%', height: '18%' }]}
        pointerEvents="none"
      />

      {/* The shadow the mark sits in, breathing under it. */}
      <Animated.View
        style={[
          styles.glow,
          { top: height * 0.535 - 165 },
          animated && {
            opacity: pingPong(glow).interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.8] }),
            transform: [
              { scale: pingPong(glow).interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) },
            ],
          },
        ]}
        pointerEvents="none"
      />

      <View style={[styles.content, { paddingTop: Math.max(insets.top, 24) + height * 0.09 }]}>
        <Rise delay={550}>
          <Text style={styles.headline}>
            Better <Text style={styles.headlineStrong}>Together</Text>
          </Text>
        </Rise>
        <Rise delay={750}>
          <Text style={styles.subhead}>
            An Association of Peers,{'\n'}by Peers, and for Peers
          </Text>
        </Rise>

        <View style={[styles.markWell, { marginTop: height * 0.28 }]}>
          {/* The halo expands out of the mark and fades, once per loop. */}
          <Animated.View
            style={[
              styles.halo,
              animated && {
                opacity: halo.interpolate({
                  inputRange: [0, 0.12, 1],
                  outputRange: [0, 0.5, 0],
                }),
                transform: [
                  { scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] }) },
                ],
              },
            ]}
            pointerEvents="none"
          />
          <Animated.View
            style={[
              styles.markFill,
              animated && {
                transform: [
                  {
                    rotate: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  {
                    scale: pingPong(breathe).interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.04],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={mark} style={styles.mark} resizeMode="contain" />
          </Animated.View>
        </View>
      </View>

      {/* Sits the progress bar off the photograph. */}
      <LinearGradient
        colors={['rgba(4,7,14,0)', 'rgba(4,7,14,0.72)', 'rgba(4,7,14,0.92)']}
        locations={[0, 0.58, 1]}
        style={styles.footerFade}
        pointerEvents="none"
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.trackFill,
              animated && {
                transform: [
                  {
                    translateX: bar.interpolate({
                      inputRange: [0, 1],
                      // The design sweeps a 42%-wide bar clear of both ends.
                      outputRange: ['-105%', '105%'],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(77,139,168,0)',
                '#4d8ba8',
                '#4a9e4f',
                '#b8544c',
                'rgba(184,84,76,0)',
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={styles.status}>Connecting peers</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SPLASH_BACKGROUND },
  backdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '72%' },
  backdropFade: { position: 'absolute', left: 0, right: 0 },
  glow: {
    position: 'absolute',
    left: '50%',
    width: 330,
    height: 330,
    marginLeft: -165,
    borderRadius: 165,
    // RN has no radial gradient; the design's is a soft dark disc, which a
    // translucent circle reproduces closely enough at this blur and opacity.
    backgroundColor: 'rgba(4,7,14,0.5)',
  },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 36 },
  headline: {
    fontFamily: 'Lato_300Light',
    fontSize: 32,
    lineHeight: 35,
    color: '#fff',
    letterSpacing: 0.32,
    textAlign: 'center',
  },
  headlineStrong: { fontFamily: 'Lato_700Bold' },
  subhead: {
    marginTop: 14,
    fontFamily: 'Lato_400Regular',
    fontSize: 13.5,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.62)',
    letterSpacing: 0.27,
    textAlign: 'center',
  },
  markWell: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    top: '-26%',
    left: '-26%',
    right: '-26%',
    bottom: '-26%',
    borderRadius: 108,
    borderWidth: 1,
    borderColor: 'rgba(150,200,230,0.5)',
  },
  markFill: { width: '100%', height: '100%' },
  // 724×630 art, kept on ratio so the knot doesn't squash.
  mark: { width: '100%', height: '100%' },
  footerFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '24%' },
  footer: { position: 'absolute', left: '15%', right: '15%', bottom: 0, alignItems: 'center', gap: 14 },
  track: {
    width: '100%',
    height: 3,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.24)',
    overflow: 'hidden',
  },
  trackFill: { width: '42%', height: '100%', borderRadius: 3, overflow: 'hidden' },
  status: {
    fontFamily: 'Lato_700Bold',
    fontSize: 11.5,
    lineHeight: 14,
    color: '#fff',
    letterSpacing: 1.61,
    textTransform: 'uppercase',
  },
});
