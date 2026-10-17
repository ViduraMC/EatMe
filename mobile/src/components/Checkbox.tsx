import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme } from '../theme';
import { haptics } from '../utils/haptics';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  /** Content on the right, e.g. a quantity. */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * A full-width checkbox row: the whole row is the tap target, not just the
 * small box. Used for the item checklist at handover.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  description,
  trailing,
  style,
}: CheckboxProps) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        onChange(!checked);
      }}
      scaleTo={0.99}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked }}
      style={[styles.row, style]}
    >
      <View
        style={[
          styles.box,
          checked && {
            backgroundColor: theme.colors.olive,
            borderColor: theme.colors.olive,
          },
        ]}
      >
        {checked ? (
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <Icon name="checkmark" size={17} color={theme.colors.onOlive} />
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.text}>
        <AppText
          variant="callout"
          color={checked ? 'textSecondary' : 'text'}
          style={checked ? styles.done : undefined}
        >
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" color="textSecondary">
            {description}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    minHeight: 52,
    paddingVertical: t.spacing.xs,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  done: { textDecorationLine: 'line-through' },
}));
