import React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme, type Tone } from '../theme';
import { haptics } from '../utils/haptics';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** A number badge, e.g. how many requests have this status. */
  count?: number;
  /** Colour when selected. Urgency filters use their urgency tone. */
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

/**
 * A filter chip. Selected chips gain a tick that pops in, so selection is
 * shown by shape as well as colour.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  count,
  tone = 'brand',
  style,
}: ChipProps) {
  const theme = useTheme();
  const styles = useStyles();
  const c = theme.tone(tone);

  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      disabled={!onPress}
      scaleTo={0.94}
      accessibilityRole="checkbox"
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      accessibilityState={{ checked: selected }}
      style={[
        styles.chip,
        selected ? { backgroundColor: c.bg, borderColor: c.accent } : null,
        style,
      ]}
    >
      {selected ? (
        <Animated.View entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(120)}>
          <Icon name="checkmark" size={16} color={c.fg} />
        </Animated.View>
      ) : icon ? (
        <Icon name={icon} size={16} color="textSecondary" />
      ) : null}
      <AppText
        variant="secondaryStrong"
        color={selected ? c.fg : 'text'}
        numberOfLines={1}
      >
        {label}
      </AppText>
      {count !== undefined ? (
        <View
          style={[
            styles.count,
            { backgroundColor: selected ? c.accent : theme.colors.surfaceMuted },
          ]}
        >
          <AppText
            variant="caption"
            color={selected ? theme.colors.onBrand : 'textSecondary'}
            style={styles.countText}
          >
            {String(count)}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
}

/** A horizontally scrolling row of chips that bleeds to the screen edges. */
export function ChipRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rowContent}
      style={[styles.row, style]}
    >
      {children}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs + 2,
    height: 40,
    paddingHorizontal: t.spacing.md - 2,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  count: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 11, lineHeight: 14 },
  row: { marginHorizontal: -t.layout.screenPadding, flexGrow: 0 },
  rowContent: {
    paddingHorizontal: t.layout.screenPadding,
    gap: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  },
}));
