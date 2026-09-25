/**
 * LEGACY: kept only while screens migrate to src/theme.
 *
 * New code uses `useTheme()` / `makeStyles()` from '../theme', which support
 * dark mode and the Sinhala typeface. These static exports are the light
 * palette under the old names, so screens that have not been migrated yet
 * already pick up the Warm Community colours instead of the old grey/green.
 *
 * Delete this file once nothing imports it.
 */
import { lightPalette as p } from '../theme/palette';
import { layout as newLayout, radius, spacing as newSpacing } from '../theme/tokens';

export const colours = {
  background: p.background,
  surface: p.surfaceMuted,
  border: p.border,
  textPrimary: p.text,
  textSecondary: p.textSecondary,
  textInverse: p.onBrand,
  accent: p.brand,
  critical: p.critical,
  urgent: p.urgent,
  safe: p.safe,
} as const;

export const fontSize = {
  title: 28,
  heading: 20,
  body: 16,
  secondary: 14,
  label: 12,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const spacing = {
  xs: newSpacing.xs,
  sm: newSpacing.sm,
  md: newSpacing.md,
  lg: newSpacing.lg,
  xl: newSpacing.xl,
  xxl: newSpacing.xxl,
} as const;

export const layout = {
  screenPadding: newLayout.screenPadding,
  radius: radius.md,
  controlHeight: newLayout.controlHeight,
  borderWidth: newLayout.borderWidth,
} as const;

export const urgencyColour = {
  critical: p.critical,
  urgent: p.urgent,
  safe: p.safe,
} as const;

export const pillTone = {
  neutral: { background: p.surfaceMuted, text: p.textSecondary },
  positive: { background: p.safeSoft, text: p.safeText },
  warning: { background: p.urgentSoft, text: p.urgentText },
  negative: { background: p.criticalSoft, text: p.criticalText },
} as const;

export type PillTone = keyof typeof pillTone;

export const surfaceDanger = p.criticalSoft;

export type UrgencyLevel = keyof typeof urgencyColour;

export const theme = {
  colours,
  fontSize,
  fontWeight,
  spacing,
  layout,
  urgencyColour,
  pillTone,
} as const;
