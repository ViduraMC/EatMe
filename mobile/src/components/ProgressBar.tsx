import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { makeStyles, useTheme, type Tone } from '../theme';

interface ProgressBarProps {
  /** 0 to 1. */
  value: number;
  tone?: Tone;
  height?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** A rounded bar that grows to its value, e.g. how much of a listing is claimed. */
export function ProgressBar({
  value,
  tone = 'brand',
  height = 8,
  accessibilityLabel,
  style,
}: ProgressBarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const c = theme.tone(tone);
  const clamped = Math.min(1, Math.max(0, value));
  const width = useSharedValue(reduced ? clamped : 0);

  useEffect(() => {
    width.value = reduced
      ? clamped
      : withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [clamped, reduced, width]);

  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: c.bg },
        style,
      ]}
      accessible={!!accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          { borderRadius: height / 2, backgroundColor: c.accent },
          fill,
        ]}
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  track: { overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
}));
