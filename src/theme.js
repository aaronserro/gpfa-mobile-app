import { Platform } from 'react-native';

export const colors = {
  bg: '#0C1713',
  bgTop: '#16302B',
  card: '#12211C',
  band: '#142823',
  deep: '#1C3833',
  green: '#A9D9A4',
  greenInk: '#0E1F1A',
  text: '#E9F1ED',
  sub: '#C7D6CF',
  muted: '#87A096',
  dim: '#5E7A70',
  faint: '#3E554C',
  coral: '#E39A94',
  hair: 'rgba(255,255,255,0.07)',
  hairSoft: 'rgba(255,255,255,0.06)',
  line: 'rgba(255,255,255,0.1)',
  fill: 'rgba(255,255,255,0.04)',
};

// The design targets iOS system fonts; RN maps `undefined` to the platform default.
export const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// Status bar / notch allowance. The .dc design hardcodes 64px of top padding
// because it renders inside a fixed 402x874 device frame.
export const TOP = Platform.OS === 'ios' ? 60 : 44;

// Height of the floating tab bar plus its bottom offset, used as scroll padding.
export const TAB_SPACE = 120;
