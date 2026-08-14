import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import cobeBundle from './cobeBundle';

/**
 * COBE globe for React Native.
 *
 * cobe is a WebGL library: it needs a real <canvas> and a GL context, neither
 * of which exist in RN. So the globe runs inside a WebView that renders the
 * library from a vendored inline copy — no network, no CDN.
 *
 * Ported from the web component: dt-based spin (so speed doesn't track refresh
 * rate), a capped devicePixelRatio, the 60-frame FPS governor that steps
 * resolution down on weak GPUs, and WebGL context-loss handling. Dropped are
 * the web-only pieces — IntersectionObserver (one screen, always visible),
 * CSS-anchored labels, and the canvas decal overlay.
 *
 * Reduced motion comes from the OS via AccessibilityInfo rather than
 * matchMedia, which is the RN equivalent of the original's media query.
 *
 * `interactive` is off by default: the globe sits behind a ScrollView, and a
 * WebView that captures touches would swallow the scroll gesture.
 */

const MOVEMENT_DAMPING = 1400;

/** A subset of COBE's options — only what this component passes through. */
export interface GlobeConfig {
  phi: number;
  theta: number;
  dark: number;
  diffuse: number;
  mapSamples: number;
  mapBrightness: number;
  /** Linear RGB triples in 0–1, not hex. */
  baseColor: [number, number, number];
  markerColor: [number, number, number];
  glowColor: [number, number, number];
  markers: { location: [number, number]; size: number }[];
}

export const GPFA_GLOBE_CONFIG: GlobeConfig = {
  phi: 0,
  theta: 0.28,
  dark: 1,
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 5.4,
  baseColor: [0.19, 0.36, 0.31],
  markerColor: [169 / 255, 217 / 255, 164 / 255],
  glowColor: [0.09, 0.19, 0.16],
  // GPFA member-organization cities, drawn from the directory.
  markers: [
    { location: [43.6532, -79.3832], size: 0.1 }, // Toronto — HOOPP, OMERS, OTPP, CIBC
    { location: [38.5816, -121.4944], size: 0.07 }, // Sacramento — CalPERS
    { location: [42.3601, -71.0589], size: 0.06 }, // Boston — eSecLending
    { location: [43.0731, -89.4012], size: 0.06 }, // Madison — SWIB
    { location: [59.9139, 10.7522], size: 0.06 }, // Oslo — NBIM
    { location: [24.4539, 54.3773], size: 0.06 }, // Abu Dhabi — ADIA
    { location: [51.5074, -0.1278], size: 0.05 }, // London
    { location: [1.3521, 103.8198], size: 0.05 }, // Singapore
  ],
};

function buildHtml({
  config,
  interactive,
  reduceMotion,
}: {
  config: GlobeConfig;
  interactive: boolean;
  reduceMotion: boolean;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin:0; padding:0; background:transparent; overflow:hidden; height:100%; }
  canvas { width:100%; height:100%; display:block; opacity:0; transition:opacity .6s ease; }
</style>
</head>
<body>
<canvas id="globe"></canvas>
<script>${cobeBundle}</script>
<script>
(function () {
  var canvas = document.getElementById('globe');
  var config = ${JSON.stringify(config)};
  var interactive = ${interactive ? 'true' : 'false'};
  var reduceMotion = ${reduceMotion ? 'true' : 'false'};

  // Cap DPR so phones don't pay for 3x retina pixels at hero size.
  function cappedDpr() {
    return Math.min(window.devicePixelRatio || 1, window.innerWidth < 640 ? 1.8 : 2);
  }

  var width = 0, dpr = cappedDpr(), resScale = 1;
  var phi = 0, spring = 0, springTarget = 0;
  var pointerDown = null, frame = null, rendered = false, failed = false;

  function onResize() {
    width = canvas.offsetWidth;
    dpr = cappedDpr();
  }
  window.addEventListener('resize', onResize);
  onResize();

  function physicalSize() { return Math.round(width * dpr * resScale); }

  // cobe's own perf recipe: fewer map samples on small screens.
  var mapSamples = window.innerWidth < 640
    ? Math.min(config.mapSamples || 16000, 10000)
    : (config.mapSamples || 16000);

  var size = physicalSize();
  if (size <= 0) { report('globe canvas has no renderable size'); return; }

  var globe;
  try {
    globe = window.createGlobe(canvas, Object.assign({}, config, {
      mapSamples: mapSamples,
      devicePixelRatio: 1,
      width: size,
      height: size
    }));
  } catch (e) { report(String(e)); return; }

  function report(msg) {
    if (failed) return;
    failed = true;
    if (frame !== null) { cancelAnimationFrame(frame); frame = null; }
    canvas.style.opacity = '0';
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: msg }));
    }
  }

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    report('webgl context lost');
  });

  if (interactive) {
    canvas.addEventListener('pointerdown', function (e) { pointerDown = e.clientX; });
    canvas.addEventListener('pointerup', function () { pointerDown = null; });
    canvas.addEventListener('pointerout', function () { pointerDown = null; });
    canvas.addEventListener('pointermove', function (e) {
      if (pointerDown === null) return;
      springTarget += (e.clientX - pointerDown) / ${MOVEMENT_DAMPING};
      pointerDown = e.clientX;
    });
  }

  var lastSize = size, lastTime = 0, frames = 0, elapsed = 0;

  function render(time) {
    var dt = 0;
    if (lastTime > 0) {
      dt = time - lastTime;
      // Ignore hitches (tab switch, GC) so only sustained load trips the governor.
      if (dt < 250) {
        elapsed += dt;
        if (++frames === 60) {
          // 40ms sits above the 33.3ms of a healthy 30Hz low-power-mode frame.
          if (elapsed / 60 > 40 && resScale > 0.75) resScale -= 0.25;
          frames = 0; elapsed = 0;
        }
      }
    }
    lastTime = time;

    // Advance by elapsed time, not frame count: 0.005 rad per 60Hz frame,
    // clamped so a dropped frame doesn't jump the rotation.
    if (pointerDown === null && !reduceMotion) {
      phi += 0.005 * (Math.min(dt, 50) / (1000 / 60));
    }
    // Cheap critically-damped follow, standing in for the web spring.
    spring += (springTarget - spring) * 0.12;

    var update = { phi: phi + spring };
    var next = physicalSize();
    if (next !== lastSize) { update.width = next; update.height = next; lastSize = next; }

    try { globe.update(update); } catch (e) { report(String(e)); return; }

    if (!rendered) {
      rendered = true;
      canvas.style.opacity = '1';
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      }
    }
    frame = requestAnimationFrame(render);
  }

  frame = requestAnimationFrame(render);
})();
</script>
</body>
</html>`;
}

export interface GlobeProps {
  style?: StyleProp<ViewStyle>;
  config?: GlobeConfig;
  /** Off by default: a touch-capturing WebView would swallow ScrollView gestures. */
  interactive?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export default function Globe({
  style,
  config = GPFA_GLOBE_CONFIG,
  interactive = false,
  onReady,
  onError,
}: GlobeProps) {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduceMotion(v))
      .catch(() => alive && setReduceMotion(false));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) =>
      setReduceMotion(v)
    );
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);

  // Hold off one tick so the globe isn't built with the wrong motion setting.
  const html = useMemo(
    () => (reduceMotion === null ? null : buildHtml({ config, interactive, reduceMotion })),
    [config, interactive, reduceMotion]
  );

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') onReady?.();
      if (msg.type === 'error') onError?.(new Error(msg.message));
    } catch {
      // non-JSON messages aren't ours
    }
  };

  if (!html) return <View style={style} />;

  return (
    <View style={style} pointerEvents={interactive ? 'auto' : 'none'}>
      <WebView
        style={styles.web}
        containerStyle={styles.web}
        source={{ html, baseUrl: 'https://localhost' }}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        domStorageEnabled={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        onMessage={onMessage}
        onError={(e) => onError?.(new Error(e.nativeEvent.description))}
        // The globe has to float over the sign-in gradient.
        opaque={false}
        backgroundColor="transparent"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
