import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { dark, light, type Theme } from './tokens';

interface ThemeContextValue {
  t: Theme;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ t: light, isDark: false, toggle: () => {} });

/**
 * Stands in for toggling the `.dark` class on the design's root element — the
 * whole token set swaps, so every consumer re-reads its colors.
 */
export function ThemeProvider({
  initialDark = false,
  children,
}: {
  initialDark?: boolean;
  children: ReactNode;
}) {
  const [isDark, setIsDark] = useState(initialDark);
  const toggle = useCallback(() => setIsDark((v) => !v), []);
  const value = useMemo<ThemeContextValue>(
    () => ({ t: isDark ? dark : light, isDark, toggle }),
    [isDark, toggle]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
