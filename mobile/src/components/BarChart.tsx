import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { makeStyles, useTheme, type Tone } from '../theme';
import { useReducedMotion } from '../theme/animations';
import { AppText } from './AppText';

export interface BarSeries {
  label: string;
  tone: Tone;
}

export interface BarGroup {
  /** Short label under the group, e.g. "Mon". */
  label: string;
  /** One value per series, in the same order as `series`. */
  values: number[];
  /** Drawn in bold, e.g. today. */
  highlight?: boolean;
}

interface BarChartProps {
  series: BarSeries[];
  groups: BarGroup[];
  /** Read out instead of the bars, which a screen reader cannot see. */
  accessibilityLabel: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A small grouped bar chart built from plain Views, so it needs no charting
 * library. Bars grow from the baseline one group after another; with reduce
 * motion on they simply appear.
 *
 * The whole chart is a single accessible element with a written summary,
 * and each series is named in a legend, so colour is never the only way to
 * tell listings from requests.
 */
export function BarChart({
  series,
  groups,
  accessibilityLabel,
  height = 132,
  style,
}: BarChartProps) {
  const styles = useStyles();
  const max = Math.max(1, ...groups.flatMap((g) => g.values));

  return (
    <View
      style={style}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.legend}>
        {series.map((s) => (
          <LegendItem key={s.label} series={s} />
        ))}
      </View>
      <View style={[styles.plot, { height }]}>
        {groups.map((g, gi) => (
          <View key={`${g.label}-${gi}`} style={styles.group}>
            <View style={styles.bars}>
              {g.values.map((v, si) => (
                <Bar
                  key={si}
                  value={v}
                  fraction={v / max}
                  height={height - 18}
                  tone={series[si]?.tone ?? 'neutral'}
                  delay={gi * 60 + si * 30}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.axis} />
      <View style={styles.labels}>
        {groups.map((g, gi) => (
          <AppText
            key={`${g.label}-${gi}`}
            variant={g.highlight ? 'secondaryStrong' : 'caption'}
            color={g.highlight ? 'text' : 'textSecondary'}
            style={styles.label}
            numberOfLines={1}
          >
            {g.label}
          </AppText>
        ))}
      </View>
    </View>
  );
}

function LegendItem({ series }: { series: BarSeries }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      <View
        style={[styles.swatch, { backgroundColor: theme.tone(series.tone).accent }]}
      />
      <AppText variant="caption" color="textSecondary">
        {series.label}
      </AppText>
    </View>
  );
}

function Bar({
  value,
  fraction,
  height,
  tone,
  delay,
}: {
  value: number;
  fraction: number;
  height: number;
  tone: Tone;
  delay: number;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const c = theme.tone(tone);
  // A zero day still shows a sliver, so "nothing happened" reads as a
  // measured zero rather than a missing bar.
  const target = Math.max(3, fraction * height);
  const h = useSharedValue(reduced ? target : 0);

  useEffect(() => {
    h.value = reduced
      ? target
      : withDelay(
          delay,
          withTiming(target, { duration: 650, easing: Easing.out(Easing.cubic) }),
        );
  }, [target, reduced, delay, h]);

  const animated = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <View style={styles.barCol}>
      {value > 0 ? (
        <AppText variant="caption" color="textSecondary" style={styles.value}>
          {value}
        </AppText>
      ) : null}
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: value > 0 ? c.accent : theme.colors.border },
          animated,
        ]}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  legend: { flexDirection: 'row', gap: t.spacing.md, marginBottom: t.spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs + 2 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  plot: { flexDirection: 'row', alignItems: 'flex-end' },
  group: { flex: 1, alignItems: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end' },
  value: { fontSize: 10, lineHeight: 14 },
  bar: { width: 11, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { height: 1, backgroundColor: t.colors.border },
  labels: { flexDirection: 'row', marginTop: t.spacing.xs + 2 },
  label: { flex: 1, textAlign: 'center' },
}));
