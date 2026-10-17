import type { TextStyle } from 'react-native';
import type { Language } from '../i18n/types';

/**
 * Font files, keyed by the family name used in styles. Loaded once in App.tsx
 * with expo-font before the splash screen hides.
 */
export const fontAssets = {
  'Fraunces-SemiBold': require('../../assets/fonts/Fraunces-Soft-SemiBold.ttf'),
  'Fraunces-Bold': require('../../assets/fonts/Fraunces-Soft-Bold.ttf'),
  'Jakarta-Regular': require('../../assets/fonts/PlusJakartaSans-Regular.ttf'),
  'Jakarta-Medium': require('../../assets/fonts/PlusJakartaSans-Medium.ttf'),
  'Jakarta-SemiBold': require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'Jakarta-Bold': require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
  'Jakarta-ExtraBold': require('../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  'NotoSinhala-Regular': require('../../assets/fonts/NotoSansSinhala-Regular.ttf'),
  'NotoSinhala-Medium': require('../../assets/fonts/NotoSansSinhala-Medium.ttf'),
  'NotoSinhala-SemiBold': require('../../assets/fonts/NotoSansSinhala-SemiBold.ttf'),
  'NotoSinhala-Bold': require('../../assets/fonts/NotoSansSinhala-Bold.ttf'),
} as const;

export interface FontFamilies {
  display: string;
  heading: string;
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
  extrabold: string;
}

/**
 * Sinhala uses Noto Sans Sinhala for everything, headings included. Fraunces
 * has no Sinhala glyphs, and letting Android fall back glyph by glyph would
 * mix two typefaces inside one word. Noto Sans Sinhala also covers Latin and
 * digits, so names and quantities stay in the same face.
 */
const families: Record<Language, FontFamilies> = {
  en: {
    display: 'Fraunces-Bold',
    heading: 'Fraunces-SemiBold',
    regular: 'Jakarta-Regular',
    medium: 'Jakarta-Medium',
    semibold: 'Jakarta-SemiBold',
    bold: 'Jakarta-Bold',
    extrabold: 'Jakarta-ExtraBold',
  },
  si: {
    display: 'NotoSinhala-Bold',
    heading: 'NotoSinhala-SemiBold',
    regular: 'NotoSinhala-Regular',
    medium: 'NotoSinhala-Medium',
    semibold: 'NotoSinhala-SemiBold',
    bold: 'NotoSinhala-Bold',
    extrabold: 'NotoSinhala-Bold',
  },
};

export type TextVariant =
  | 'display'
  | 'title'
  | 'headline'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'secondary'
  | 'secondaryStrong'
  | 'caption'
  | 'overline'
  | 'button'
  | 'stat';

type Spec = {
  size: number;
  line: number;
  family: keyof FontFamilies;
  tracking?: number;
  upper?: boolean;
};

/**
 * The type scale. Names describe the job, not the size, so a screen asks for
 * "headline" and gets the same thing on every screen.
 *
 * Display, title and headline are the soft serif (Fraunces); everything else
 * is Plus Jakarta Sans. The serif is reserved for moments of voice (screen
 * titles, the greeting, empty states) so it never slows down scanning a list.
 */
const scale: Record<TextVariant, Spec> = {
  display: { size: 34, line: 40, family: 'display', tracking: -0.5 },
  title: { size: 28, line: 34, family: 'display', tracking: -0.3 },
  headline: { size: 22, line: 28, family: 'heading', tracking: -0.2 },
  subtitle: { size: 18, line: 24, family: 'bold' },
  body: { size: 16, line: 24, family: 'regular' },
  bodyStrong: { size: 16, line: 24, family: 'semibold' },
  callout: { size: 15, line: 22, family: 'medium' },
  secondary: { size: 14, line: 20, family: 'regular' },
  secondaryStrong: { size: 14, line: 20, family: 'semibold' },
  caption: { size: 12, line: 16, family: 'medium' },
  overline: { size: 11, line: 14, family: 'bold', tracking: 1.1, upper: true },
  button: { size: 16, line: 20, family: 'bold', tracking: 0.1 },
  stat: { size: 30, line: 34, family: 'extrabold', tracking: -0.5 },
};

export function buildTypography(language: Language): {
  fonts: FontFamilies;
  variants: Record<TextVariant, TextStyle>;
} {
  const fonts = families[language];
  const isSinhala = language === 'si';

  const variants = {} as Record<TextVariant, TextStyle>;
  for (const [name, spec] of Object.entries(scale) as [TextVariant, Spec][]) {
    variants[name] = {
      fontFamily: fonts[spec.family],
      fontSize: isSinhala ? spec.size - (spec.size >= 22 ? 2 : 0) : spec.size,
      // Sinhala glyphs are taller, with marks above and below the line; the
      // Latin line heights clip them.
      lineHeight: isSinhala ? Math.round(spec.line * 1.25) : spec.line,
      // Sinhala has no letter case, and tracking breaks its conjuncts.
      letterSpacing: isSinhala ? 0 : (spec.tracking ?? 0),
      textTransform: spec.upper && !isSinhala ? 'uppercase' : 'none',
    };
  }
  return { fonts, variants };
}

/**
 * Users can enlarge text in Android settings, and the app honours it, up to
 * this multiplier. Beyond it, fixed-height controls would clip their labels.
 */
export const MAX_FONT_SCALE = 1.35;
