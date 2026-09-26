/**
 * The "Warm Community" palette: terracotta, olive and sand.
 *
 * Every colour here is semantic. Screens ask for `colors.brand` or
 * `colors.criticalText`, never for "terracotta" or a hex code, so switching to
 * dark mode is a matter of swapping this object.
 *
 * Contrast: every text/background pairing below was checked against WCAG 2.1
 * AA (4.5:1 for text, 3:1 for icons, borders and large text) in both light
 * and dark. The results are in docs/ux/accessibility-report.md.
 *
 * Urgency colours are deliberately NOT the brand colour. If "safe" were the
 * same green as the brand, or "critical" the same red-orange as terracotta,
 * a recipient scanning a list could not tell branding from a warning. The
 * brand is terracotta, safe is an olive green, urgent is saffron and critical
 * is a true red.
 */

export interface Palette {
  /** Page background, sand. */
  background: string;
  /** Cards, sheets, inputs. */
  surface: string;
  /** Chips, input fills, skeletons, pressed rows. */
  surfaceMuted: string;
  /** A surface that sits above another surface, e.g. a sheet in dark mode. */
  surfaceElevated: string;
  /** Dims the screen behind a sheet or dialog. */
  scrim: string;

  border: string;
  /** Input borders and other non-text UI that must pass 3:1. */
  borderStrong: string;

  text: string;
  textSecondary: string;
  /** Hints and timestamps only. Passes 3:1, not 4.5:1, so never for body copy. */
  textTertiary: string;

  brand: string;
  brandPressed: string;
  brandSoft: string;
  /** Brand-coloured text and links; darker than `brand` so it reads as text. */
  brandText: string;
  onBrand: string;

  olive: string;
  oliveSoft: string;
  oliveText: string;
  onOlive: string;

  critical: string;
  criticalSoft: string;
  criticalText: string;

  urgent: string;
  urgentSoft: string;
  urgentText: string;

  safe: string;
  safeSoft: string;
  safeText: string;

  /** In transit and other informational, non-judgemental states. */
  info: string;
  infoSoft: string;
  infoText: string;

  /** Warm brown shadows look natural on sand; pure black looks dirty. */
  shadow: string;
  skeletonBase: string;
  skeletonHighlight: string;
  /** Hero headers and the splash: terracotta into a warmer orange. */
  heroGradient: readonly [string, string];
}

export const lightPalette: Palette = {
  background: '#F7F1E8',
  surface: '#FFFDF9',
  surfaceMuted: '#F0E7DA',
  surfaceElevated: '#FFFFFF',
  scrim: 'rgba(43, 33, 24, 0.45)',

  border: '#E5D8C6',
  borderStrong: '#9E8970',

  text: '#2B2118',
  textSecondary: '#66564A',
  textTertiary: '#857465',

  brand: '#B84A26',
  brandPressed: '#9A3C1D',
  brandSoft: '#F8E1D6',
  brandText: '#9A3C1D',
  onBrand: '#FFFFFF',

  olive: '#5E6C30',
  oliveSoft: '#E8EBD5',
  oliveText: '#4A5626',
  onOlive: '#FFFFFF',

  critical: '#B42318',
  criticalSoft: '#FDE5E1',
  criticalText: '#8E1B12',

  urgent: '#B87700',
  urgentSoft: '#FCEFD0',
  urgentText: '#7A4F00',

  safe: '#5F7F3A',
  safeSoft: '#E6EED9',
  safeText: '#3F5A22',

  info: '#3D6B8C',
  infoSoft: '#E2ECF3',
  infoText: '#2C516C',

  shadow: '#5A3A20',
  skeletonBase: '#EDE3D5',
  skeletonHighlight: '#F8F2E9',
  heroGradient: ['#B84A26', '#D9733F'],
};

/**
 * Dark mode keeps the light theme's character instead of inverting it: the
 * same terracotta with white labels, on warm charcoal rather than brown, so
 * the brand reads the same in both themes. Tints are low-saturation so
 * panels and pills look like the light theme dimmed, not like new colours.
 * (The first version used a pale salmon brand with dark labels and
 * maroon/swamp-green tints, which testers found unnatural.)
 */
export const darkPalette: Palette = {
  background: '#141210',
  surface: '#1E1B18',
  surfaceMuted: '#2A2622',
  surfaceElevated: '#322D28',
  scrim: 'rgba(0, 0, 0, 0.62)',

  border: '#35302A',
  borderStrong: '#7F7468',

  text: '#F3EDE6',
  textSecondary: '#BFB5AA',
  textTertiary: '#978C81',

  brand: '#C0512B',
  brandPressed: '#A8441F',
  brandSoft: '#30241E',
  brandText: '#EE9670',
  onBrand: '#FFFFFF',

  olive: '#66763A',
  oliveSoft: '#25281F',
  oliveText: '#BAC784',
  onOlive: '#FFFFFF',

  critical: '#EC7264',
  criticalSoft: '#381F1B',
  criticalText: '#F5A398',

  urgent: '#E5A93E',
  urgentSoft: '#352A16',
  urgentText: '#F0C470',

  safe: '#97B86A',
  safeSoft: '#232C1D',
  safeText: '#B1CE8A',

  info: '#7EACCD',
  infoSoft: '#1C2630',
  infoText: '#A0C3DD',

  shadow: '#000000',
  skeletonBase: '#25211D',
  skeletonHighlight: '#322D28',
  heroGradient: ['#9A3E1F', '#BE5530'],
};

/** Tones a badge, banner or icon container can take. */
export type Tone =
  'neutral' | 'brand' | 'olive' | 'info' | 'safe' | 'urgent' | 'critical';

/** Background, foreground and accent for each tone, in the given palette. */
export function toneColors(
  p: Palette,
  tone: Tone,
): { bg: string; fg: string; accent: string } {
  switch (tone) {
    case 'brand':
      return { bg: p.brandSoft, fg: p.brandText, accent: p.brand };
    case 'olive':
      return { bg: p.oliveSoft, fg: p.oliveText, accent: p.olive };
    case 'info':
      return { bg: p.infoSoft, fg: p.infoText, accent: p.info };
    case 'safe':
      return { bg: p.safeSoft, fg: p.safeText, accent: p.safe };
    case 'urgent':
      return { bg: p.urgentSoft, fg: p.urgentText, accent: p.urgent };
    case 'critical':
      return { bg: p.criticalSoft, fg: p.criticalText, accent: p.critical };
    default:
      return { bg: p.surfaceMuted, fg: p.textSecondary, accent: p.textTertiary };
  }
}
