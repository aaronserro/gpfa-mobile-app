import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../ds/ThemeProvider';

/**
 * The episode's shape at a glance — the RN stand-in for the portal's
 * WaveformGlyph. Bars left of `progress` take the brand colour, the rest the
 * hairline rule, so a row shows how far the member has listened.
 *
 * `peaks` are 0–1 amplitudes; 24–32 of them read well at row width.
 */
function Waveform({
  peaks,
  progress = 0,
  height = 18,
  bar = 3,
  gap = 1.5,
}: {
  peaks: number[];
  progress?: number;
  height?: number;
  bar?: number;
  gap?: number;
}) {
  const { t } = useTheme();
  const visiblePeaks = peaks.slice(0, 48);

  return (
    <View style={[styles.row, { height, gap }]}>
      {visiblePeaks.map((peak, i) => (
        <View
          key={i}
          style={{
            width: bar,
            height: Math.max(2, Math.round(peak * height)),
            borderRadius: 1,
            backgroundColor: i / visiblePeaks.length < progress ? t.brandGreen : t.ruleHairline,
          }}
        />
      ))}
    </View>
  );
}

export default memo(Waveform);

/**
 * A stable peak set for an episode with no `peaks` from the API — seeded from
 * the slug so a row never changes shape between renders.
 */
export function fallbackPeaks(slug: string, count = 26): number[] {
  let seed = 0;
  for (let i = 0; i < slug.length; i++) seed = (seed * 31 + slug.charCodeAt(i)) % 9973;
  return Array.from({ length: count }, () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return 0.28 + (((seed >>> 8) % 1000) / 1000) * 0.72;
  });
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
});
