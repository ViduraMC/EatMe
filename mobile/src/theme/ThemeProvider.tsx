import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme, type ViewStyle, type TextStyle } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import {
  darkPalette,
  lightPalette,
  toneColors,
  type Palette,
  type Tone,
} from './palette';
import { elevation, layout, motion, radius, spacing } from './tokens';
import { buildTypography, type FontFamilies, type TextVariant } from './typography';
import { useI18n } from '../i18n';
import { writePref } from '../utils/preferences';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
  motion: typeof motion;
  fonts: FontFamilies;
  text: Record<TextVariant, TextStyle>;
  elevation: (level: 0 | 1 | 2 | 3) => ViewStyle;
  tone: (tone: Tone) => { bg: string; fg: string; accent: string };
  /** React Navigation's theme, derived from the same palette and fonts. */
  navigation: NavigationTheme;
}

function buildTheme(scheme: ColorScheme, language: 'en' | 'si'): Theme {
  const colors = scheme === 'dark' ? darkPalette : lightPalette;
  const { fonts, variants } = buildTypography(language);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return {
    scheme,
    isDark: scheme === 'dark',
    colors,
    spacing,
    radius,
    layout,
    motion,
    fonts,
    text: variants,
    elevation: (level) => elevation(level, colors.shadow),
    tone: (tone) => toneColors(colors, tone),
    navigation: {
      ...base,
      dark: scheme === 'dark',
      colors: {
        ...base.colors,
        primary: colors.brand,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
        notification: colors.critical,
      },
      fonts: {
        regular: { fontFamily: fonts.regular, fontWeight: 'normal' },
        medium: { fontFamily: fonts.medium, fontWeight: 'normal' },
        bold: { fontFamily: fonts.bold, fontWeight: 'normal' },
        heavy: { fontFamily: fonts.extrabold, fontWeight: 'normal' },
      },
    },
  };
}

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Light, dark, or follow the phone.
 *
 * "System" is the default because it respects a choice the user already made
 * in Android settings. The override exists for people who want EatMe dark at
 * night regardless.
 *
 * The theme object is rebuilt only when the scheme or the language changes,
 * so makeStyles() can cache compiled styles per theme object.
 */
export function ThemeProvider({
  initialPreference,
  children,
}: {
  initialPreference: ThemePreference;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const { language } = useI18n();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);

  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const theme = useMemo(() => buildTheme(scheme, language), [scheme, language]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void writePref('theme', next);
  }, []);

  const value = useMemo(
    () => ({ theme, preference, setPreference }),
    [theme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemePreference(): [ThemePreference, (p: ThemePreference) => void] {
  const { preference, setPreference } = useThemeContext();
  return [preference, setPreference];
}

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}
