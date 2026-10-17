import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { makeStyles, useTheme } from '../theme';
import { useT } from '../i18n';
import type { UrgencyLevel } from '../types/donation';
import { urgencyIcon, urgencyTone } from '../utils/freshness';

interface UrgencyBadgeProps {
  level: UrgencyLevel;
  /** "3 hours left". Shown after the level. */
  timeLeft?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/**
 * "Critical · 3 hours left". The level is always written in words and has
 * its own icon, so it never relies on colour alone.
 */
export function UrgencyBadge({ level, timeLeft, size = 'md', style }: UrgencyBadgeProps) {
  const theme = useTheme();
  const styles = useStyles();
  const t = useT();
  const reduced = useReducedMotion();
  const c = theme.tone(urgencyTone[level]);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (level === 'critical' && !reduced) {
      blink.value = withRepeat(
        withSequence(
          withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    } else {
      blink.value = 1;
    }
  }, [level, reduced, blink]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: blink.value }));
  const levelLabel = t(`urgency.${level}`);
  const label = timeLeft ? `${levelLabel} · ${timeLeft}` : levelLabel;

  return (
    <View
      style={[styles.badge, size === 'sm' && styles.sm, { backgroundColor: c.bg }, style]}
      accessible
      accessibilityLabel={
        timeLeft
          ? t('a11y.urgencyTime', { level: levelLabel, time: timeLeft })
          : levelLabel
      }
    >
      {level === 'critical' ? (
        <Animated.View style={[styles.dot, { backgroundColor: c.accent }, dotStyle]} />
      ) : null}
      <Icon name={urgencyIcon[level]} size={size === 'sm' ? 13 : 15} color={c.fg} />
      <AppText variant="caption" color={c.fg} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.xs + 1,
    paddingHorizontal: t.spacing.sm + 2,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.pill,
  },
  sm: { paddingHorizontal: t.spacing.sm, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
}));
