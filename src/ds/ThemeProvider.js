import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { dark, light } from './tokens';

const ThemeContext = createContext({ t: light, isDark: false, toggle: () => {} });

/**
 * Stands in for toggling the `.dark` class on the design's root element — the
 * whole token set swaps, so every consumer re-reads its colors.
 */
export function ThemeProvider({ initialDark = false, children }) {
  const [isDark, setIsDark] = useState(initialDark);
  const toggle = useCallback(() => setIsDark((v) => !v), []);
  const value = useMemo(() => ({ t: isDark ? dark : light, isDark, toggle }), [isDark, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
