import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { makeStyles, useTheme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../utils/haptics';

interface SlideToConfirmProps {
  label: string;
  /** Shown once confirmed, e.g. "Pickup confirmed". */
  doneLabel: string;
  /** Resolve to confirm; throw to spring back so the user can try again. */
  onConfirm: () => Promise<void>;
  tone?: 'brand' | 'olive';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT = 62;
const KNOB = 52;
const PAD = (HEIGHT - KNOB) / 2;
const THRESHOLD = 0.82;

/**
 * Slide to confirm, for actions that record something in the real world
 * that cannot be taken back: "the food has been handed over".
 *
 * A tap is too easy to do by accident (in a pocket, while carrying boxes).
 * A slide needs deliberate intent, but is still one fluid motion. The knob
 * nudges twice when it first appears, to show that it moves.
 *
 * Screen reader users cannot comfortably drag, so for them the whole control
 * is a normal button: double tap confirms.
 */
export function SlideToConfirm({
  label,
  doneLabel,
  onConfirm,
  tone = 'olive',
  disabled,
  style,
}: SlideToConfirmProps) {
  const theme = useTheme();
  const styles = useStyles();
  const t = useT();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');

  const accent = tone === 'olive' ? theme.colors.olive : theme.colors.brand;
  const soft = tone === 'olive' ? theme.colors.oliveSoft : theme.colors.brandSoft;
  const onAccent = tone === 'olive' ? theme.colors.onOlive : theme.colors.onBrand;
  const fgSoft = tone === 'olive' ? theme.colors.oliveText : theme.colors.brandText;

  const max = Math.max(0, width - KNOB - PAD * 2);
  const x = useSharedValue(0);
  const crossed = useSharedValue(false);

  // Affordance: nudge the knob twice so it's obvious it slides.
  useEffect(() => {
    if (reduced || max === 0 || disabled) return;
    x.value = withDelay(
      600,
      withSequence(
        withTiming(22, { duration: 260 }),
        withSpring(0, { damping: 10, stiffness: 200 }),
        withDelay(250, withTiming(14, { duration: 200 })),
        withSpring(0, { damping: 10, stiffness: 200 }),
      ),
    );
  }, [max, reduced, disabled, x]);

  async function run() {
    setState('working');
    haptics.success();
    try {
      await onConfirm();
      setState('done');
    } catch {
      haptics.error();
      setState('idle');
      x.value = withSpring(0, theme.motion.spring.gentle);
    }
  }

  const pan = Gesture.Pan()
    .enabled(!disabled && state === 'idle' && max > 0)
    .onUpdate((e) => {
      x.value = Math.min(max, Math.max(0, e.translationX));
      const over = x.value > max * THRESHOLD;
      if (over !== crossed.value) {
        crossed.value = over;
        scheduleOnRN(haptics.selection);
      }
    })
    .onEnd(() => {
      if (x.value > max * THRESHOLD) {
        x.value = withSpring(max, theme.motion.spring.snappy);
        scheduleOnRN(run);
      } else {
        x.value = withSpring(0, theme.motion.spring.gentle);
      }
    });

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + KNOB + PAD }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, max * 0.6 || 1], [1, 0], Extrapolation.CLAMP),
  }));

  const done = state === 'done';

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.track,
        { backgroundColor: done ? accent : soft },
        disabled && styles.disabled,
        style,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={done ? doneLabel : label}
      accessibilityHint={done ? undefined : t('a11y.slideToConfirm')}
      accessibilityState={{
        disabled: !!disabled || state !== 'idle',
        busy: state === 'working',
      }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => {
        if (!disabled && state === 'idle') {
          x.value = withTiming(max, { duration: 200 });
          void run();
        }
      }}
    >
      {!done ? (
        <Animated.View
          style={[styles.fill, { backgroundColor: accent, opacity: 0.18 }, fillStyle]}
        />
      ) : null}

      <Animated.View
        style={[styles.labelWrap, done ? styles.labelDone : labelStyle]}
        pointerEvents="none"
      >
        {done ? <Icon name="checkmark-circle" size={22} color={onAccent} /> : null}
        <AppText variant="bodyStrong" color={done ? onAccent : fgSoft} numberOfLines={1}>
          {done ? doneLabel : label}
        </AppText>
        {!done ? <Icon name="chevron-forward" size={18} color={fgSoft} /> : null}
      </Animated.View>

      {!done ? (
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.knob, { backgroundColor: accent }, knobStyle]}>
            {state === 'working' ? (
              <ActivityIndicator color={onAccent} />
            ) : (
              <Icon name="arrow-forward" size={24} color={onAccent} />
            )}
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: HEIGHT / 2 },
  labelWrap: {
    position: 'absolute',
    left: KNOB + PAD * 2,
    right: t.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
  },
  labelDone: { left: t.spacing.md },
  knob: {
    position: 'absolute',
    left: PAD,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.elevation(2),
  },
  disabled: { opacity: 0.45 },
}));
