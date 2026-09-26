import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { makeStyles, useTheme } from '../theme';
import { haptics } from '../utils/haptics';

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  /** Olive for "available" style switches, brand for everything else. */
  tone?: 'brand' | 'olive';
}

const TRACK_W = 52;
const TRACK_H = 32;
const KNOB = 24;
const TRAVEL = TRACK_W - KNOB - 8;

/** An on/off switch with a springy knob. Reports as a switch to screen readers. */
export function Toggle({
  value,
  onChange,
  accessibilityLabel,
  disabled,
  tone = 'brand',
}: ToggleProps) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);
  const on = tone === 'olive' ? theme.colors.olive : theme.colors.brand;
  const off = theme.colors.borderStrong;

  useEffect(() => {
    progress.value = reduced
      ? withTiming(value ? 1 : 0, { duration: 120 })
      : withSpring(value ? 1 : 0, theme.motion.spring.snappy);
  }, [value, reduced, progress, theme.motion.spring.snappy]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [off, on]),
  }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onChange(!value);
      }}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
    >
      <Animated.View style={[styles.track, disabled && styles.disabled, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: 4,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    ...t.elevation(1),
  },
  disabled: { opacity: 0.4 },
}));
