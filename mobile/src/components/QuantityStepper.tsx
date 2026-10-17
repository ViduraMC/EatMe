import React, { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useReducedMotion,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { makeStyles } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../utils/haptics';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  step?: number;
  /** Unit shown under the number, e.g. "servings". */
  unit?: string;
  /** What is being counted, for screen readers: "Chicken fried rice". */
  label: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Minus, number, plus. Holding a button repeats and speeds up, so asking for
 * 40 servings is one long press rather than 40 taps.
 *
 * Each step gives a light tick; hitting the limit gives a firmer buzz, so
 * "that's all there is" can be felt as well as seen.
 *
 * Screen readers treat the whole control as one adjustable value: swipe up
 * or down to change it, instead of hunting for two small buttons.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  label,
  style,
}: QuantityStepperProps) {
  const styles = useStyles();
  const t = useT();
  const reduced = useReducedMotion();
  const direction = useRef<1 | -1>(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => stop, []);

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function bump(delta: number): boolean {
    const next = Math.min(max, Math.max(min, latest.current + delta));
    if (next === latest.current) {
      haptics.warning();
      return false;
    }
    direction.current = delta > 0 ? 1 : -1;
    haptics.selection();
    latest.current = next;
    onChange(next);
    return true;
  }

  function startRepeat(delta: number) {
    stop();
    let interval = 260;
    const tick = () => {
      if (!bump(delta)) {
        stop();
        return;
      }
      interval = Math.max(55, interval * 0.8);
      timer.current = setTimeout(tick, interval);
    };
    tick();
  }

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        min,
        max,
        now: value,
        text: unit ? `${value} ${unit}` : String(value),
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        bump(e.nativeEvent.actionName === 'increment' ? step : -step);
      }}
    >
      <IconButton
        icon="remove"
        variant="tonal"
        tone="brand"
        disabled={value <= min}
        onPress={() => bump(-step)}
        onLongPress={() => startRepeat(-step)}
        onPressOut={stop}
        accessibilityLabel={t('a11y.decrease', { label })}
      />

      <View style={styles.valueWrap}>
        <Animated.View
          key={value}
          entering={
            reduced
              ? undefined
              : (direction.current > 0 ? FadeInUp : FadeInDown).duration(160)
          }
        >
          <AppText variant="subtitle" align="center">
            {String(value)}
          </AppText>
        </Animated.View>
        {unit ? (
          <AppText
            variant="caption"
            color="textSecondary"
            align="center"
            numberOfLines={1}
          >
            {unit}
          </AppText>
        ) : null}
      </View>

      <IconButton
        icon="add"
        variant="filled"
        tone="brand"
        disabled={value >= max}
        onPress={() => bump(step)}
        onLongPress={() => startRepeat(step)}
        onPressOut={stop}
        accessibilityLabel={t('a11y.increase', { label })}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  valueWrap: { minWidth: 60, alignItems: 'center', overflow: 'hidden' },
}));
