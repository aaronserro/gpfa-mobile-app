/**
 * GPFA design-system tokens, transcribed from the design project's
 * tokens/{colors,typography,layout}.css.
 *
 * CSS custom properties cascade and recompute on theme change; RN has no
 * cascade, so each theme is a resolved flat object and `var()` references are
 * inlined. `color-mix(... N%, transparent)` becomes an rgba() at N% alpha,
 * which is what it evaluates to when mixed against transparent.
 */

/** rgba() from a #rrggbb hex plus an alpha, standing in for color-mix with transparent. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** The resolved token set for one theme — the RN stand-in for `:root` / `.dark`. */
export interface Theme {
  name: 'light' | 'dark';

  surfacePage: string;
  surfacePaper: string;
  surfaceSoft: string;
  surfaceAnchor: string;
  surfaceAnchorSoft: string;

  inkStrong: string;
  inkBody: string;
  inkMuted: string;
  inkFaint: string;
  inkInverse: string;

  brandGreen: string;
  brandGreenStrong: string;
  brandGreenSoft: string;
  brandGreenOnDark: string;
  brandLeaf: string;
  brandRed: string;
  brandBlue: string;
  brandAmber: string;
  brandAmberSoft: string;
  brandBrick: string;
  brandBrickInk: string;

  ruleHairline: string;
  ruleStrong: string;
  ruleOnAnchor: string;

  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;

  radius: number;
  radiusCard: number;
  radiusBtn: number;
  radiusPill: number;
}

const shared = {
  // Not overridden by .dark — the anchor surface is the same teal in both themes.
  surfaceAnchor: '#33565f',
  brandGreenOnDark: '#a5d69d',
  brandLeaf: '#479338',
  radius: 4,
  radiusCard: 8,
  radiusBtn: 8,
  radiusPill: 9999,
};

export const light: Theme = {
  ...shared,
  name: 'light',
  surfacePage: '#f7fafb',
  surfacePaper: '#ffffff',
  surfaceSoft: '#dce9ec',
  surfaceAnchorSoft: '#294851',

  inkStrong: '#132329',
  inkBody: '#243940',
  inkMuted: '#53686f',
  inkFaint: '#7a8c91',
  inkInverse: '#eff7f8',

  brandGreen: '#33565f',
  brandGreenStrong: '#4f2a54',
  brandGreenSoft: 'rgba(51,86,95,.1)',
  brandRed: '#993c3c',
  brandBlue: '#4b9bb7',
  brandAmber: '#b8801f',
  brandAmberSoft: 'rgba(184,128,31,.1)',
  brandBrick: '#be5050',
  brandBrickInk: '#b04545',

  ruleHairline: '#c8d8dc',
  ruleStrong: '#9cb4bb',
  ruleOnAnchor: 'rgba(239,247,248,.18)',

  // shadcn-style semantic aliases
  primary: '#33565f',
  primaryForeground: '#ffffff',
  secondary: '#dce9ec',
  secondaryForeground: '#132329',
  muted: '#dce9ec',
  mutedForeground: '#53686f',
  border: '#c8d8dc',
  input: '#c8d8dc',
};

export const dark: Theme = {
  ...shared,
  name: 'dark',
  surfacePage: '#081416',
  surfacePaper: '#0d1c1f',
  surfaceSoft: '#162b2f',
  surfaceAnchorSoft: '#173942',

  inkStrong: '#eaf3f5',
  inkBody: '#d2dee1',
  inkMuted: '#aebfc4',
  inkFaint: '#74898f',
  inkInverse: '#f4fbfc',

  // .dark remaps --brand-green to --brand-green-on-dark
  brandGreen: '#a5d69d',
  brandGreenStrong: '#c0e0b9',
  brandGreenSoft: 'rgba(165,214,157,.16)',
  brandRed: '#e0817d',
  brandBlue: '#8ccbe0',
  brandAmber: '#d8a23e',
  brandAmberSoft: 'rgba(216,162,62,.16)',
  brandBrick: '#e09a94',
  brandBrickInk: '#ecb8b3',

  ruleHairline: '#1f3438',
  ruleStrong: '#315058',
  ruleOnAnchor: 'rgba(244,251,252,.2)',

  primary: '#a5d69d',
  primaryForeground: '#07171b',
  secondary: '#162b2f',
  secondaryForeground: '#eaf3f5',
  muted: '#162b2f',
  mutedForeground: '#aebfc4',
  border: '#1f3438',
  input: '#315058',
};

/**
 * RN selects a face by family name, not by numeric weight, so every weight is
 * a separate loaded font.
 */
export type SansWeight = 400 | 500 | 600 | 700;
export type MonoWeight = 400 | 500 | 600;

const SANS: Record<SansWeight, string> = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
};

const MONO: Record<MonoWeight, string> = {
  400: 'JetBrainsMono_400Regular',
  500: 'JetBrainsMono_500Medium',
  600: 'JetBrainsMono_600SemiBold',
};

export const sans = (w: SansWeight = 400): string => SANS[w];
export const mono = (w: MonoWeight = 400): string => MONO[w];

/** --tracking-display / --tracking-eyebrow, converted from em to points at a given size. */
export const trackDisplay = (size: number): number => size * -0.021;
export const trackEyebrow = (size: number): number => size * 0.18;

/** The .wg-rule-* left-border variants in base.css. */
export type WgRuleClass =
  | 'wg-rule-legal'
  | 'wg-rule-risk'
  | 'wg-rule-technology'
  | 'wg-rule-collateral-liquidity'
  | 'wg-rule-private-credit'
  | 'wg-rule-regional'
  | 'wg-rule-general';

/**
 * Per post type: chip ink, fill, border and label.
 *
 * Three designs have specified these. WG Forum and Working Groups Feed (the
 * newest) agree on this assignment; the Working Group Posts doc briefly
 * reassigned them, and that outlier is not what's used here. Derived from
 * tokens rather than the designs' literal hexes so the dark theme's remapped
 * brand colours carry through.
 */
export interface PostTypeStyle {
  ink: string;
  chipBg: string;
  chipBd: string;
  label: string;
}

export const postTypeStyle = (
  t: Theme,
  type: 'discussion' | 'poll' | 'announcement' | 'event'
): PostTypeStyle => {
  const base = {
    discussion: { c: t.brandAmber, bd: 0.4, label: 'Discussion' },
    poll: { c: t.brandGreenStrong, bd: 0.35, label: 'Poll' },
    announcement: { c: t.brandBlue, bd: 0.35, label: 'Announcement' },
    event: { c: t.surfaceAnchor, bd: 0.4, label: 'Event' },
  }[type];
  return {
    ink: base.c,
    chipBg: alpha(base.c, 0.1),
    chipBd: alpha(base.c, base.bd),
    label: base.label,
  };
};

export const wgRule = (t: Theme, cls: WgRuleClass): string =>
  ({
    'wg-rule-legal': t.surfaceAnchor,
    'wg-rule-risk': t.brandRed,
    'wg-rule-technology': t.brandBlue,
    'wg-rule-collateral-liquidity': '#5a8a6a',
    'wg-rule-private-credit': t.brandGreen,
    'wg-rule-regional': t.inkMuted,
    'wg-rule-general': t.ruleStrong,
  })[cls];

/**
 * The iOS device frame in the design puts 62px of status bar above the content,
 * so a screen's `padding-top` already includes it. On a real device the inset
 * replaces that allowance.
 */
export const FRAME_STATUS_BAR = 62;
export const topPad = (insetTop: number, designTop: number): number =>
  Math.max(insetTop, 0) + (designTop - FRAME_STATUS_BAR);
