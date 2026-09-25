import { Easing } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

/**
 * Spacing on an 8px grid, with 4 and 2 for the fine gaps between a label and
 * its value. The names match the old constants/theme.ts so screens migrating
 * across keep their layout.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

/**
 * Generous, organic radii. Rounded shapes read as friendly and soft, which is
 * the point of the Warm Community direction; sharp corners read as clinical.
 */
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const layout = {
  /** Left and right padding of every screen. */
  screenPadding: 20,
  /** Height of buttons and inputs. */
  controlHeight: 52,
  /** WCAG 2.5.5 / Material minimum tap target. */
  minTouch: 48,
  borderWidth: 1,
  tabBarHeight: 64,
  /** Cap for readable line length on tablets. */
  maxContentWidth: 640,
} as const;

/**
 * Elevation levels. Shadows are warm brown in light mode (palette.shadow), so
 * cards look lifted off sand rather than smudged with grey.
 */
export function elevation(level: 0 | 1 | 2 | 3, shadowColor: string): ViewStyle {
  switch (level) {
    case 0:
      return {};
    case 1:
      return {
        shadowColor,
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      };
    case 2:
      return {
        shadowColor,
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      };
    default:
      return {
        shadowColor,
        shadowOpacity: 0.16,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
      };
  }
}

/**
 * Motion tokens.
 *
 * One vocabulary for every animation in the app: a press, a list entering and
 * a sheet opening all feel related because they share these values.
 *
 * Every animated component also checks useReducedMotion(). When the phone's
 * "Remove animations" setting is on, movement is replaced by an instant or
 * cross-fade change. See docs/ux/design-system.md.
 */
export const motion = {
  duration: {
    instant: 100,
    fast: 180,
    base: 260,
    slow: 400,
    slower: 600,
  },
  /** Material 3 "emphasized" curve: quick start, long gentle settle. */
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    decelerate: Easing.bezier(0, 0, 0, 1),
    accelerate: Easing.bezier(0.3, 0, 1, 1),
  },
  spring: {
    /** Presses and toggles: fast, no visible overshoot. */
    snappy: { damping: 20, stiffness: 320, mass: 0.7 },
    /** Sheets and cards settling into place. */
    gentle: { damping: 22, stiffness: 160, mass: 1 },
    /** Success moments only, e.g. the confirmation tick. */
    bouncy: { damping: 11, stiffness: 190, mass: 0.9 },
  },
  /** Delay between list items entering, and the cap so long lists do not crawl. */
  stagger: 45,
  staggerCap: 8,
  /** How far a pressed control shrinks. */
  pressScale: 0.97,
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
