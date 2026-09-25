import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { motion } from './tokens';

/**
 * Entering and layout animations shared by lists and screens.
 *
 * Every helper takes `reduced` (from useReducedMotion) and returns a plain,
 * short fade when the phone's "Remove animations" setting is on. Movement can
 * cause discomfort for people with vestibular disorders; a fade does not.
 */

/** A list item rising into place, staggered by its index. */
export function enterListItem(index: number, reduced: boolean) {
  if (reduced) return FadeIn.duration(motion.duration.fast);
  const delay = Math.min(index, motion.staggerCap) * motion.stagger;
  return FadeInDown.delay(delay)
    .duration(motion.duration.slow)
    .springify()
    .damping(motion.spring.gentle.damping)
    .stiffness(motion.spring.gentle.stiffness);
}

/** A section of a screen appearing after the header. */
export function enterSection(order: number, reduced: boolean) {
  if (reduced) return FadeIn.duration(motion.duration.fast);
  return FadeInDown.delay(80 + order * 70)
    .duration(motion.duration.slow)
    .easing(motion.easing.decelerate);
}

/** A bottom element (sticky footer, toast) rising from below. */
export function enterFromBelow(reduced: boolean) {
  if (reduced) return FadeIn.duration(motion.duration.fast);
  return FadeInUp.duration(motion.duration.base).easing(motion.easing.decelerate);
}

export function exitFade() {
  return FadeOut.duration(motion.duration.fast);
}

/** Smoothly moves siblings when an item is added or removed from a list. */
export function layoutTransition(reduced: boolean) {
  return reduced ? undefined : LinearTransition.springify().damping(22).stiffness(180);
}

export { useReducedMotion };
