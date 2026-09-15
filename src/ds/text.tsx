import type { ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from './ThemeProvider';
import { mono, sans, trackDisplay } from './tokens';

export type AppTextVariant =
  | 'display'
  | 'sectionTitle'
  | 'cardTitle'
  | 'body'
  | 'caption'
  | 'meta';

export type AppTextTone =
  | 'strong'
  | 'body'
  | 'muted'
  | 'faint'
  | 'accent'
  | 'danger'
  | 'inverse';

export interface AppTextProps extends Omit<TextProps, 'children' | 'style'> {
  children: ReactNode;
  variant?: AppTextVariant;
  tone?: AppTextTone;
  style?: StyleProp<TextStyle>;
}

/** Semantic mobile typography backed by the loaded GPFA font faces and theme. */
export function AppText({
  children,
  variant = 'body',
  tone = 'body',
  style,
  ...props
}: AppTextProps) {
  const { t } = useTheme();
  const colors: Record<AppTextTone, string> = {
    strong: t.inkStrong,
    body: t.inkBody,
    muted: t.inkMuted,
    faint: t.inkFaint,
    accent: t.brandGreen,
    danger: t.brandRed,
    inverse: t.inkInverse,
  };

  return (
    <Text {...props} style={[styles[variant], { color: colors[tone] }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: sans(600),
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: trackDisplay(27),
  },
  sectionTitle: {
    fontFamily: sans(600),
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: trackDisplay(19),
  },
  cardTitle: {
    fontFamily: sans(600),
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: sans(400),
    fontSize: 14.5,
    lineHeight: 21,
  },
  caption: {
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 19,
  },
  meta: {
    fontFamily: mono(400),
    fontSize: 12.5,
    lineHeight: 18,
  },
});
