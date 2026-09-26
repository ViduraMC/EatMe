import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme, type Tone } from '../theme';

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  /** Required: an icon alone has no visible label for a screen reader to read. */
  accessibilityLabel: string;
  variant?: 'plain' | 'tonal' | 'filled' | 'outline';
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Hold behaviour, e.g. the quantity stepper's accelerating repeat. */
  onLongPress?: () => void;
  onPressOut?: () => void;
  style?: StyleProp<ViewStyle>;
}

const DIAMETER = { sm: 36, md: 44, lg: 52 } as const;
const GLYPH = { sm: 18, md: 22, lg: 24 } as const;

/**
 * A round, icon-only button. The visible circle can be as small as 36, but the
 * touch area is padded out to 48 with hitSlop, so it is still easy to hit.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'plain',
  tone = 'neutral',
  size = 'md',
  disabled,
  onLongPress,
  onPressOut,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const colors = theme.tone(tone);
  const d = DIAMETER[size];
  const slop = Math.max(0, (theme.layout.minTouch - d) / 2);

  const bg =
    variant === 'filled'
      ? tone === 'neutral'
        ? theme.colors.text
        : colors.accent
      : variant === 'tonal'
        ? colors.bg
        : variant === 'outline'
          ? theme.colors.surface
          : 'transparent';

  const fg =
    variant === 'filled'
      ? tone === 'neutral'
        ? theme.colors.background
        : theme.colors.onBrand
      : tone === 'neutral'
        ? theme.colors.text
        : colors.fg;

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      delayLongPress={350}
      disabled={disabled}
      haptic={onLongPress ? false : 'selection'}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      scaleTo={0.9}
      style={[
        styles.base,
        { width: d, height: d, borderRadius: d / 2, backgroundColor: bg },
        variant === 'outline' && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={GLYPH[size]} color={fg} />
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: { alignItems: 'center', justifyContent: 'center' },
  outline: { borderWidth: 1, borderColor: t.colors.border },
  disabled: { opacity: 0.4 },
}));
