import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { makeStyles, useTheme } from '../theme';

export type StepState = 'done' | 'current' | 'upcoming' | 'failed';

export interface TimelineStep {
  key: string;
  title: string;
  subtitle?: string;
  state: StepState;
  icon?: IconName;
}

interface TimelineProps {
  steps: readonly TimelineStep[];
  /** vertical: full detail. horizontal: compact, for cards. */
  orientation?: 'vertical' | 'horizontal';
  style?: StyleProp<ViewStyle>;
}

/**
 * The journey of a donation: posted, requested, driver assigned, picked up,
 * delivered. Showing where a delivery is, and what comes next, answers the
 * question every role keeps asking ("where is the food?") without a phone
 * call.
 */
export function Timeline({ steps, orientation = 'vertical', style }: TimelineProps) {
  const styles = useStyles();
  if (orientation === 'horizontal') {
    return (
      <View style={[styles.hRow, style]} accessible accessibilityLabel={describe(steps)}>
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <Node state={step.state} icon={step.icon} index={i} small />
            {i < steps.length - 1 ? (
              <Connector filled={step.state === 'done'} index={i} horizontal />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    );
  }

  return (
    <View style={style} accessibilityRole="list">
      {steps.map((step, i) => (
        <View
          key={step.key}
          style={styles.vRow}
          accessible
          accessibilityLabel={`${step.title}${step.subtitle ? `, ${step.subtitle}` : ''}`}
        >
          <View style={styles.rail}>
            <Node state={step.state} icon={step.icon} index={i} />
            {i < steps.length - 1 ? (
              <Connector filled={step.state === 'done'} index={i} />
            ) : null}
          </View>
          <View style={styles.vText}>
            <AppText
              variant={step.state === 'current' ? 'bodyStrong' : 'callout'}
              color={
                step.state === 'upcoming'
                  ? 'textTertiary'
                  : step.state === 'failed'
                    ? 'criticalText'
                    : 'text'
              }
            >
              {step.title}
            </AppText>
            {step.subtitle ? (
              <AppText variant="caption" color="textSecondary">
                {step.subtitle}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function describe(steps: readonly TimelineStep[]): string {
  const current =
    steps.find((s) => s.state === 'current') ??
    steps.filter((s) => s.state === 'done').pop();
  return current ? current.title : '';
}

function Node({
  state,
  icon,
  index,
  small,
}: {
  state: StepState;
  icon?: IconName;
  index: number;
  small?: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  const appear = useSharedValue(reduced ? 1 : 0);
  const size = small ? 22 : 30;

  useEffect(() => {
    appear.value = reduced ? 1 : withDelay(index * 120, withTiming(1, { duration: 320 }));
  }, [appear, index, reduced]);

  useEffect(() => {
    if (state === 'current' && !reduced) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      );
    } else {
      pulse.value = 0;
    }
  }, [state, reduced, pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.5,
    transform: [{ scale: 1 + pulse.value * 0.7 }],
  }));
  const pop = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: 0.6 + appear.value * 0.4 }],
  }));

  const colors = {
    done: {
      bg: theme.colors.olive,
      fg: theme.colors.onOlive,
      border: theme.colors.olive,
    },
    current: {
      bg: theme.colors.brand,
      fg: theme.colors.onBrand,
      border: theme.colors.brand,
    },
    upcoming: {
      bg: theme.colors.surface,
      fg: theme.colors.textTertiary,
      border: theme.colors.borderStrong,
    },
    failed: { bg: theme.colors.critical, fg: '#FFFFFF', border: theme.colors.critical },
  }[state];

  const glyph: IconName =
    state === 'done' ? 'checkmark' : state === 'failed' ? 'close' : (icon ?? 'ellipse');

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {state === 'current' ? (
        <Animated.View
          style={[
            styles.pulse,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.bg,
            },
            ring,
          ]}
        />
      ) : null}
      <Animated.View
        style={[
          styles.node,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.bg,
            borderColor: colors.border,
          },
          pop,
        ]}
      >
        {state === 'upcoming' && !icon ? (
          <View style={[styles.hollowDot, { backgroundColor: colors.border }]} />
        ) : (
          <Icon name={glyph} size={small ? 12 : 16} color={colors.fg} />
        )}
      </Animated.View>
    </View>
  );
}

function Connector({
  filled,
  index,
  horizontal,
}: {
  filled: boolean;
  index: number;
  horizontal?: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced || !filled ? (filled ? 1 : 0) : 0);

  useEffect(() => {
    if (!filled) {
      grow.value = 0;
      return;
    }
    grow.value = reduced
      ? 1
      : withDelay(
          index * 120 + 160,
          withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }),
        );
  }, [filled, index, reduced, grow]);

  const fill = useAnimatedStyle(() =>
    horizontal ? { width: `${grow.value * 100}%` } : { height: `${grow.value * 100}%` },
  );

  return (
    <View style={horizontal ? styles.hLine : styles.vLine}>
      <Animated.View
        style={[
          horizontal ? styles.hFill : styles.vFill,
          { backgroundColor: theme.colors.olive },
          fill,
        ]}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  vRow: { flexDirection: 'row', gap: t.spacing.sm + 4, minHeight: 58 },
  rail: { alignItems: 'center', width: 30 },
  vText: { flex: 1, paddingTop: 3, paddingBottom: t.spacing.md },
  vLine: {
    flex: 1,
    width: 3,
    borderRadius: 2,
    backgroundColor: t.colors.border,
    marginVertical: 3,
  },
  vFill: { width: '100%', borderRadius: 2 },
  hRow: { flexDirection: 'row', alignItems: 'center' },
  hLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: t.colors.border,
    marginHorizontal: 3,
  },
  hFill: { height: '100%', borderRadius: 2 },
  node: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  hollowDot: { width: 8, height: 8, borderRadius: 4 },
  pulse: { position: 'absolute' },
}));
