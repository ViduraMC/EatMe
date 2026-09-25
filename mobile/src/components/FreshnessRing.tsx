import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from './Icon';
import { makeStyles, useTheme } from '../theme';
import type { UrgencyLevel } from '../types/donation';
import { urgencyIcon, urgencyTone } from '../utils/freshness';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface FreshnessRingProps {
  /** 1 = freshly made, 0 = expired. See freshnessFraction(). */
  fraction: number;
  level: UrgencyLevel;
  size?: number;
  strokeWidth?: number;
  /** Read out instead of the ring, e.g. "Critical, 3 hours left". */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The freshness ring: EatMe's signature element.
 *
 * Surplus food is a race against time, so every item shows how much of its
 * safe life is left as a ring that drains, coloured and iconed by urgency.
 * It draws in when it first appears, so the eye is pulled to it, and
 * critical items breathe with a slow pulse.
 *
 * Reduced motion: the ring appears already drawn and does not pulse.
 */
export function FreshnessRing({
  fraction,
  level,
  size = 52,
  strokeWidth = 5,
  accessibilityLabel,
  style,
}: FreshnessRingProps) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const c = theme.tone(urgencyTone[level]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));

  const progress = useSharedValue(reduced ? clamped : 0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    progress.value = reduced
      ? clamped
      : withTiming(clamped, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [clamped, reduced, progress]);

  useEffect(() => {
    if (level === 'critical' && !reduced) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [level, reduced, pulse]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.35,
    transform: [{ scale: 1 + pulse.value * 0.14 }],
  }));

  return (
    <View
      style={[{ width: size, height: size }, styles.wrap, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: c.accent,
          },
          haloStyle,
        ]}
      />
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={c.bg}
          strokeWidth={strokeWidth}
          fill={theme.colors.surface}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={c.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={arcProps}
          // Start the arc at 12 o'clock rather than 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Icon name={urgencyIcon[level]} size={size * 0.4} color={c.fg} />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  svg: { position: 'absolute' },
}));
