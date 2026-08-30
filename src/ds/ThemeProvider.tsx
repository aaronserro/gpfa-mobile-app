import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Theme } from './tokens';

const THEME_PREFERENCE = 'gpfa.theme';
export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  t: Theme;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  setDark: (value: boolean) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  t: light,
  isDark: false,
  preference: 'system',
  setPreference: () => {},
  setDark: () => {},
  toggle: () => {},
});

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
  const colorScheme = useColorScheme();
  const [preference, setStoredPreference] = useState<ThemePreference>(
    initialDark ? 'dark' : 'system'
  );
  const isDark = preference === 'system' ? colorScheme === 'dark' : preference === 'dark';

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(THEME_PREFERENCE).then((value) => {
      if (alive && (value === 'system' || value === 'light' || value === 'dark')) {
        setStoredPreference(value);
      }
    }).catch(() => {
      // Theme preference is non-critical; keep the configured default.
    });
    return () => {
      alive = false;
    };
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setStoredPreference(value);
    void AsyncStorage.setItem(THEME_PREFERENCE, value).catch(() => {
      // A storage failure should not prevent the in-memory theme change.
    });
  }, []);
  const setDark = useCallback((value: boolean) => {
    setPreference(value ? 'dark' : 'light');
  }, [setPreference]);
  const toggle = useCallback(() => setPreference(isDark ? 'light' : 'dark'), [isDark, setPreference]);
  const value = useMemo<ThemeContextValue>(
    () => ({ t: isDark ? dark : light, isDark, preference, setPreference, setDark, toggle }),
    [isDark, preference, setDark, setPreference, toggle]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
