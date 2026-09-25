import React from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme } from '../theme';
import type { HapticKind } from '../utils/haptics';

export type ButtonVariant =
  'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger' | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon before the label. */
  icon?: IconName;
  /** Icon after the label, e.g. a forward arrow on "Continue". */
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Shrink to the label instead of filling the row. */
  inline?: boolean;
  haptic?: HapticKind | false;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Buttons have one job each, shown by variant:
 *
 * - primary:   the one main action on a screen (Post listing, Request food)
 * - secondary: an alternative (Cancel, Back to listings)
 * - tonal:     a supporting action that should still stand out (Add another item)
 * - ghost:     low emphasis, inline (See all, Skip)
 * - danger:    destructive (Cancel listing)
 * - success:   confirming a handover
 *
 * A screen should have at most one primary button, so the next step is never
 * ambiguous.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  inline = false,
  haptic,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const isDisabled = disabled || loading;

  const fg = {
    primary: theme.colors.onBrand,
    secondary: theme.colors.text,
    tonal: theme.colors.brandText,
    ghost: theme.colors.brandText,
    danger: theme.isDark ? theme.colors.onBrand : '#FFFFFF',
    success: theme.colors.onOlive,
  }[variant];

  const iconSize = size === 'sm' ? 18 : 20;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      haptic={
        haptic ?? (variant === 'primary' || variant === 'success' ? 'light' : false)
      }
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        styles[size],
        styles[variant],
        inline && styles.inline,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
          <ActivityIndicator color={fg} />
        </Animated.View>
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={iconSize} color={fg} /> : null}
          <AppText
            variant="button"
            color={fg}
            numberOfLines={1}
            style={size === 'sm' ? styles.labelSm : undefined}
          >
            {label}
          </AppText>
          {iconRight ? <Icon name={iconRight} size={iconSize} color={fg} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  sm: { height: 40, paddingHorizontal: t.spacing.md },
  md: { height: t.layout.controlHeight },
  lg: { height: 58 },
  inline: { alignSelf: 'flex-start' },
  primary: { backgroundColor: t.colors.brand, ...t.elevation(1) },
  secondary: {
    backgroundColor: t.colors.surface,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.borderStrong,
  },
  tonal: { backgroundColor: t.colors.brandSoft },
  ghost: { backgroundColor: 'transparent', paddingHorizontal: t.spacing.sm },
  danger: { backgroundColor: t.colors.critical },
  success: { backgroundColor: t.colors.olive, ...t.elevation(1) },
  disabled: { opacity: 0.45 },
  labelSm: { fontSize: 14 },
}));
