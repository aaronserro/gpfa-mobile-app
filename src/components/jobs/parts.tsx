/**
 * Pieces shared by the job board list and a single posting.
 *
 * Kept here rather than in ds/primitives because nothing outside the board
 * uses them. The square org mark used to live here too; the member directory
 * needs it as well, so it moved to `ds/primitives` as `OrgMark`.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../ds/ThemeProvider';
import { alpha, jobSourceStyle, mono, sans } from '../../ds/tokens';
import type { JobSource } from '../../api/types';

/** Where the listing came from — a member organization, or the secretariat. */
export function SourceChip({ source, size = 9.5 }: { source: JobSource; size?: number }) {
  const { t } = useTheme();
  const skin = jobSourceStyle(t, source);
  return (
    <View style={[styles.chip, { borderColor: skin.chipBd, backgroundColor: skin.chipBg }]}>
      <Text style={[styles.chipText, { fontSize: size, color: skin.ink }]}>{skin.label}</Text>
    </View>
  );
}

/** A fact pill: location, compensation, function — or the amber closing date. */
export function FactChip({
  icon,
  children,
  tone = 'default',
}: {
  icon: (color: string) => ReactNode;
  children: ReactNode;
  tone?: 'default' | 'amber';
}) {
  const { t } = useTheme();
  const amber = tone === 'amber';
  return (
    <View
      style={[
        styles.fact,
        {
          borderColor: amber ? alpha(t.brandAmber, 0.4) : t.ruleHairline,
          backgroundColor: amber ? t.brandAmberSoft : t.surfacePage,
        },
      ]}
    >
      {icon(amber ? t.brandAmber : t.inkMuted)}
      <Text style={[styles.factText, { color: amber ? t.brandAmber : t.inkBody }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 32,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  chipText: {
    fontFamily: mono(400),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 32,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  factText: { fontFamily: sans(400), fontSize: 11.5 },
});
