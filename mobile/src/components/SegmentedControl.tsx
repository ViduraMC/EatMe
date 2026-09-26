import React, { useEffect, useState } from 'react';
import {
  View,
  type LayoutChangeEvent,
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
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme } from '../theme';
import { haptics } from '../utils/haptics';

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Read out before the options, e.g. "Food type". */
  accessibilityLabel?: string;
  /**
   * Icon above the label, with room for two lines. For three or more
   * options whose labels would otherwise be cut off ("Room temperature").
   */
  stacked?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PAD = 4;

/**
 * Two to four mutually exclusive options. The thumb slides between them, so
 * the change is visible as movement, not just a colour swap.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
  stacked = false,
  style,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    segments.findIndex((s) => s.value === value),
  );
  const segmentWidth = width > 0 ? (width - PAD * 2) / segments.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    const target = index * segmentWidth;
    x.value = reduced
      ? withTiming(target, { duration: 0 })
      : withSpring(target, theme.motion.spring.snappy);
  }, [index, segmentWidth, reduced, theme.motion.spring.snappy, x]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      style={[styles.track, stacked && styles.trackStacked, style]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            stacked && styles.thumbStacked,
            { width: segmentWidth },
            thumbStyle,
          ]}
        />
      ) : null}
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <PressableScale
            key={segment.value}
            onPress={() => {
              if (!selected) {
                haptics.selection();
                onChange(segment.value);
              }
            }}
            scaleTo={0.96}
            accessibilityRole="radio"
            accessibilityLabel={segment.label}
            accessibilityState={{ checked: selected }}
            style={[styles.segment, stacked && styles.segmentStacked]}
          >
            {segment.icon ? (
              <Icon
                name={segment.icon}
                size={18}
                color={selected ? 'brandText' : 'textSecondary'}
              />
            ) : null}
            <AppText
              variant="secondaryStrong"
              color={selected ? 'text' : 'textSecondary'}
              numberOfLines={stacked ? 2 : 1}
              align="center"
            >
              {segment.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    flexDirection: 'row',
    backgroundColor: t.colors.surfaceMuted,
    borderRadius: t.radius.pill,
    padding: PAD,
    minHeight: t.layout.minTouch,
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceElevated,
    ...t.elevation(1),
  },
  trackStacked: { borderRadius: t.radius.md },
  thumbStacked: { borderRadius: t.radius.md - 2 },
  segmentStacked: {
    flexDirection: 'column',
    gap: 2,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.xs,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs + 2,
    paddingHorizontal: t.spacing.sm,
    minHeight: 40,
  },
}));
