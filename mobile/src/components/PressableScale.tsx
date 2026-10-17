import React from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../theme';
import { haptics, type HapticKind } from '../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far to shrink when pressed. Cards use a gentler value than buttons. */
  scaleTo?: number;
  /** Haptic fired when the press is released on target. */
  haptic?: HapticKind | false;
  children?: React.ReactNode;
}

/**
 * The shared press feedback: a quick spring shrink on the UI thread, so it
 * stays smooth even while JavaScript is busy loading the next screen.
 *
 * With reduced motion on, it dims slightly instead of scaling.
 */
export function PressableScale({
  style,
  scaleTo = motion.pressScale,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduced) {
      return { opacity: 1 - pressed.value * 0.25 };
    }
    return { transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }] };
  });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.value = reduced
          ? withTiming(1, { duration: motion.duration.instant })
          : withSpring(1, motion.spring.snappy);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = reduced
          ? withTiming(0, { duration: motion.duration.fast })
          : withSpring(0, motion.spring.snappy);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
