import React, { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import {
  Easing,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme, type Tone } from '../theme';

interface StatTileProps {
  label: string;
  value: number;
  icon: IconName;
  tone?: Tone;
  /** Small text under the number, e.g. "this month". */
  caption?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A dashboard number that counts up from zero when it first appears. The
 * count-up draws the eye to the figure and makes a dashboard feel alive,
 * without any fake data: it always lands on the real value.
 */
export function StatTile({
  label,
  value,
  icon,
  tone = 'brand',
  caption,
  onPress,
  style,
}: StatTileProps) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const c = theme.tone(tone);
  const animated = useSharedValue(reduced ? value : 0);
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    animated.value = reduced
      ? value
      : withTiming(value, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [value, reduced, animated]);

  useAnimatedReaction(
    () => Math.round(animated.value),
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setShown, current);
    },
  );

  const content = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
        <Icon name={icon} size={20} color={c.fg} />
      </View>
      <AppText variant="stat" style={styles.value}>
        {String(shown)}
      </AppText>
      <AppText variant="secondaryStrong" color="textSecondary" numberOfLines={2}>
        {label}
      </AppText>
      {caption ? (
        <AppText variant="caption" color="textTertiary">
          {caption}
        </AppText>
      ) : null}
    </>
  );

  const a11yLabel = `${label}: ${value}${caption ? `, ${caption}` : ''}`;

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={[styles.tile, style]}
      >
        {content}
      </PressableScale>
    );
  }
  return (
    <View style={[styles.tile, style]} accessible accessibilityLabel={a11yLabel}>
      {content}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  tile: {
    flex: 1,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    gap: 2,
    borderWidth: t.isDark ? 1 : 0,
    borderColor: t.colors.border,
    ...t.elevation(1),
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: t.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.sm,
  },
  value: { marginBottom: 2 },
}));
