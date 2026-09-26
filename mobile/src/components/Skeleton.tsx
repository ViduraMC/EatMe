import React, { useEffect, useState } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { makeStyles, useTheme } from '../theme';
import { useT } from '../i18n';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A placeholder block with a soft light sweeping across it.
 *
 * Skeletons are used instead of spinners for lists: the page takes its final
 * shape straight away, so nothing jumps when the data arrives, and the wait
 * feels shorter.
 */
export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (reduced || w === 0) return;
    x.value = 0;
    x.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
      -1,
    );
  }, [reduced, w, x]);

  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: -w + x.value * w * 2 }],
  }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.skeletonBase,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {!reduced && w > 0 ? (
        <Animated.View style={[{ width: w, height: '100%' }, sweep]}>
          <LinearGradient
            colors={['transparent', theme.colors.skeletonHighlight, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The shape of a listing or request card, used while a list loads. */
export function SkeletonCard() {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={52} height={52} radius={26} />
        <View style={styles.lines}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="45%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={12} style={styles.gap} />
      <Skeleton width="60%" height={12} />
    </View>
  );
}

/** A stack of skeleton cards. Announced once to screen readers as "Loading content". */
export function SkeletonList({ count = 4 }: { count?: number }) {
  const t = useT();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('a11y.loadingContent')}
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
    gap: t.spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  lines: { flex: 1, gap: t.spacing.sm },
  gap: { marginTop: t.spacing.xs },
}));
