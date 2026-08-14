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
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
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

export const light = {
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

export const dark = {
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
export const sans = (w = 400) =>
  ({ 400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold', 700: 'Inter_700Bold' })[w];

export const mono = (w = 400) =>
  ({ 400: 'JetBrainsMono_400Regular', 500: 'JetBrainsMono_500Medium', 600: 'JetBrainsMono_600SemiBold' })[w];

/** --tracking-display / --tracking-eyebrow, converted from em to points at a given size. */
export const trackDisplay = (size) => size * -0.021;
export const trackEyebrow = (size) => size * 0.18;

/** Left rules for working groups (.wg-rule-* in base.css). */
export const wgRule = (t, cls) =>
  ({
    'wg-rule-legal': t.surfaceAnchor,
    'wg-rule-risk': t.brandRed,
    'wg-rule-technology': t.brandBlue,
    'wg-rule-collateral-liquidity': '#5a8a6a',
    'wg-rule-private-credit': t.brandGreen,
    'wg-rule-regional': t.inkMuted,
    'wg-rule-general': t.ruleStrong,
  })[cls] || 'transparent';

/**
 * The iOS device frame in the design puts 62px of status bar above the content,
 * so a screen's `padding-top` already includes it. On a real device the inset
 * replaces that allowance.
 */
export const FRAME_STATUS_BAR = 62;
export const topPad = (insetTop, designTop) => Math.max(insetTop, 0) + (designTop - FRAME_STATUS_BAR);
