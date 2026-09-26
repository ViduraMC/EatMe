import * as Haptics from 'expo-haptics';

/**
 * Tactile feedback, used sparingly and always for a reason:
 *
 * - selection: a value changed (chip, segment, stepper tick)
 * - light:     a press that starts something (primary buttons)
 * - success:   something irreversible worked (listing posted, pickup confirmed)
 * - warning:   the user is about to do something destructive
 * - error:     an action failed validation
 *
 * Haptics run alongside the visual response and never replace it, so someone
 * with vibration off, or on a phone without a motor, loses nothing. Failures
 * are swallowed: a missing motor is not an error.
 */
export const haptics = {
  selection: () => void Haptics.selectionAsync().catch(() => {}),
  light: () =>
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () =>
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    ),
  warning: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    ),
  error: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {},
    ),
};

export type HapticKind = keyof typeof haptics;
