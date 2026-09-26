import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { makeStyles, useTheme } from '../theme';

export interface HandshakeSide {
  /** "You" or the other person's role. */
  label: string;
  name: string;
  /** ISO time they confirmed, or null while waiting. */
  confirmedAt: string | null;
  /** Already-formatted "Confirmed 6:05 PM". */
  confirmedText?: string;
}

interface HandshakePanelProps {
  left: HandshakeSide;
  right: HandshakeSide;
  waitingLabel: string;
  title: string;
}

/**
 * Both parties confirm a handover.
 *
 * A food handover is only trustworthy if both sides say it happened, so the
 * app shows both sides at once: each person, a line from them to a handshake
 * in the middle, and whether they have confirmed. A side's line fills in when
 * that person confirms, and the handshake lights up when both have. Whoever
 * is being waited on pulses gently, so it is obvious who the delivery is
 * waiting for.
 */
export function HandshakePanel({
  left,
  right,
  waitingLabel,
  title,
}: HandshakePanelProps) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const both = !!left.confirmedAt && !!right.confirmedAt;
  const pop = useSharedValue(both ? 1 : 0);

  useEffect(() => {
    pop.value = reduced
      ? both
        ? 1
        : 0
      : withSpring(both ? 1 : 0, theme.motion.spring.bouncy);
  }, [both, reduced, pop, theme.motion.spring.bouncy]);

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + pop.value * 0.15 }],
  }));

  const summary = `${title}. ${left.label}: ${left.confirmedAt ? (left.confirmedText ?? '') : waitingLabel}. ${right.label}: ${
    right.confirmedAt ? (right.confirmedText ?? '') : waitingLabel
  }.`;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={summary}>
      <AppText
        variant="overline"
        color="textSecondary"
        align="center"
        style={styles.title}
      >
        {title}
      </AppText>
      <View style={styles.row}>
        <Side side={left} waitingLabel={waitingLabel} />
        <Line filled={!!left.confirmedAt} />
        <Animated.View
          style={[
            styles.center,
            { backgroundColor: both ? theme.colors.olive : theme.colors.surfaceMuted },
            centerStyle,
          ]}
        >
          <Icon
            name="mc:handshake"
            size={26}
            color={both ? theme.colors.onOlive : 'textTertiary'}
          />
        </Animated.View>
        <Line filled={!!right.confirmedAt} reverse />
        <Side side={right} waitingLabel={waitingLabel} />
      </View>
    </View>
  );
}

function Side({ side, waitingLabel }: { side: HandshakeSide; waitingLabel: string }) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  const done = !!side.confirmedAt;

  useEffect(() => {
    if (!done && !reduced) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    } else {
      pulse.value = 1;
    }
  }, [done, reduced, pulse]);

  const waitStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.side}>
      <View>
        <Avatar name={side.name} size={48} />
        <View
          style={[
            styles.tick,
            { backgroundColor: done ? theme.colors.olive : theme.colors.surfaceMuted },
          ]}
        >
          <Icon
            name={done ? 'checkmark' : 'time-outline'}
            size={12}
            color={done ? theme.colors.onOlive : 'textSecondary'}
          />
        </View>
      </View>
      <AppText variant="secondaryStrong" align="center" numberOfLines={1}>
        {side.label}
      </AppText>
      {done ? (
        <AppText variant="caption" color="oliveText" align="center" numberOfLines={2}>
          {side.confirmedText}
        </AppText>
      ) : (
        <Animated.View style={waitStyle}>
          <AppText variant="caption" color="textSecondary" align="center">
            {waitingLabel}
          </AppText>
        </Animated.View>
      )}
    </View>
  );
}

function Line({ filled, reverse }: { filled: boolean; reverse?: boolean }) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const grow = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    grow.value = reduced
      ? filled
        ? 1
        : 0
      : withTiming(filled ? 1 : 0, { duration: 500 });
  }, [filled, reduced, grow]);

  const fill = useAnimatedStyle(() => ({ width: `${grow.value * 100}%` }));

  return (
    <View style={[styles.line, reverse && styles.reverse]}>
      <Animated.View
        style={[styles.lineFill, { backgroundColor: theme.colors.olive }, fill]}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    padding: t.spacing.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surfaceMuted,
    marginBottom: t.spacing.md,
  },
  title: { marginBottom: t.spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  side: { width: 92, alignItems: 'center', gap: 4 },
  tick: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: t.colors.surfaceMuted,
  },
  line: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.colors.border,
    marginTop: 22,
    overflow: 'hidden',
  },
  reverse: { transform: [{ scaleX: -1 }] },
  lineFill: { height: '100%', borderRadius: 2 },
  center: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
}));
