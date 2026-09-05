/**
 * Design tokens, taken from the Sprint 0 Figma wireframes.
 *
 * Import from here rather than writing a hex code or a pixel value inline.
 * Five people building five modules will otherwise end up with five slightly
 * different greens and four different button heights.
 */

export const colours = {
  background: '#FFFFFF',
  surface: '#F4F4F5',
  border: '#E4E4E7',

  textPrimary: '#18181B',
  textSecondary: '#71717A',
  /** Text placed on top of an accent or urgency colour. */
  textInverse: '#FFFFFF',

  accent: '#16A34A',

  /** Urgency, matching server/src/services/urgency.service.ts. */
  critical: '#DC2626',
  urgent: '#F59E0B',
  safe: '#16A34A',
} as const;

/** Type scale. Names describe the role, not the size. */
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

/**
 * Spacing on an 8px grid.
 *
 * xs is 4 because a half step is genuinely needed for things like the gap
 * between a label and its input. Everything larger is a multiple of 8.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const layout = {
  /** Left and right padding for every screen. */
  screenPadding: 16,
  radius: 12,
  /** Height of a button or a text input. Also the minimum tap target. */
  controlHeight: 48,
  borderWidth: 1,
} as const;

/** Maps an urgency level from the API to its colour. */
export const urgencyColour = {
  critical: colours.critical,
  urgent: colours.urgent,
  safe: colours.safe,
} as const;

export const pillTone = {
  neutral: { background: colours.surface, text: colours.textSecondary },
  positive: { background: '#DCFCE7', text: '#166534' },
  warning: { background: '#FEF3C7', text: '#B45309' },
  negative: { background: '#FEE2E2', text: '#B91C1C' },
} as const;

export type PillTone = keyof typeof pillTone;

//Pale red panel behind decline reason on the history screen.
export const surfaceDanger = '#FEF2F2';

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
