/**
 * Pieces shared by the job board list and a single posting.
 *
 * Kept here rather than in ds/primitives because nothing outside the board
 * uses them — the square org mark in particular is deliberately not the round
 * `Avatar`, which stands for a person.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../ds/ThemeProvider';
import { alpha, jobSourceStyle, mono, sans } from '../../ds/tokens';
import type { JobSource } from '../../api/types';

/** The organization's initials, squared off so it reads as a logo slot. */
export function OrgMark({ initials, size = 36 }: { initials: string; size?: number }) {
  const { t } = useTheme();
  return (
    <View
      style={[
        styles.orgMark,
        {
          width: size,
          height: size,
          backgroundColor: t.surfaceSoft,
          borderColor: t.ruleHairline,
        },
      ]}
    >
      <Text style={[styles.orgMarkText, { fontSize: size >= 40 ? 13 : 12, color: t.inkMuted }]}>
        {initials}
      </Text>
    </View>
  );
}

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
  orgMark: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgMarkText: { fontFamily: sans(600) },

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
