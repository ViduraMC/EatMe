import React, { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../utils/haptics';

export interface TabIcons {
  [routeName: string]: { icon: IconName; iconActive: IconName };
}

interface EatMeTabBarProps extends BottomTabBarProps {
  icons: TabIcons;
  /** Optional raised centre button, e.g. the donor's "Donate". */
  centerAction?: { label: string; icon: IconName; onPress: () => void };
}

/**
 * The bottom tab bar.
 *
 * A soft pill slides to the active tab on a spring, and the icon swaps to
 * its filled version, so the current place is shown by shape and movement,
 * not colour alone. Every tab is a full-height, full-width target.
 *
 * Donors get a raised centre "Donate" button: posting food is their main
 * job, so it is always one thumb-tap away from anywhere in their app.
 */
export function EatMeTabBar({
  state,
  descriptors,
  navigation,
  icons,
  centerAction,
}: EatMeTabBarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [rowWidth, setRowWidth] = useState(0);

  const routes = state.routes;
  const slots = routes.length + (centerAction ? 1 : 0);
  const slotWidth = rowWidth / Math.max(1, slots);
  const centerIndex = centerAction ? Math.floor(routes.length / 2) : -1;

  const slotOf = (routeIndex: number) =>
    centerAction && routeIndex >= centerIndex ? routeIndex + 1 : routeIndex;

  const x = useSharedValue(0);
  useEffect(() => {
    const target = slotOf(state.index) * slotWidth;
    x.value = reduced
      ? withTiming(target, { duration: 0 })
      : withSpring(target, theme.motion.spring.snappy);
  }, [state.index, slotWidth, reduced]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const tabs = routes.map((route, index) => {
    const { options } = descriptors[route.key]!;
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : (options.title ?? route.name);
    const focused = state.index === index;
    const set = icons[route.name];
    const badge = options.tabBarBadge;

    return (
      <PressableScale
        key={route.key}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            haptics.selection();
            navigation.navigate(route.name, route.params);
          }
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        scaleTo={0.92}
        accessibilityRole="tab"
        accessibilityLabel={badge ? `${label}, ${badge}` : t('a11y.tab', { label })}
        accessibilityState={{ selected: focused }}
        style={styles.tab}
      >
        <View>
          <Icon
            name={
              focused ? (set?.iconActive ?? 'ellipse') : (set?.icon ?? 'ellipse-outline')
            }
            size={24}
            color={focused ? 'brandText' : 'textSecondary'}
          />
          {badge !== undefined ? (
            <View style={styles.badge}>
              <AppText
                variant="caption"
                color={theme.isDark ? theme.colors.onBrand : '#FFFFFF'}
                style={styles.badgeText}
              >
                {String(badge)}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText
          variant="caption"
          color={focused ? 'brandText' : 'textSecondary'}
          numberOfLines={1}
          style={focused ? styles.labelActive : undefined}
        >
          {label}
        </AppText>
      </PressableScale>
    );
  });

  if (centerAction) {
    tabs.splice(
      centerIndex,
      0,
      <View key="__center" style={styles.tab}>
        <PressableScale
          onPress={() => {
            haptics.medium();
            centerAction.onPress();
          }}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={centerAction.label}
          style={styles.fab}
        >
          <Icon name={centerAction.icon} size={30} color={theme.colors.onBrand} />
        </PressableScale>
        <AppText
          variant="caption"
          color="brandText"
          numberOfLines={1}
          style={styles.fabLabel}
        >
          {centerAction.label}
        </AppText>
      </View>,
    );
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View
        style={styles.row}
        onLayout={(e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
      >
        {rowWidth > 0 ? (
          <Animated.View style={[styles.pillTrack, { width: slotWidth }, pillStyle]}>
            <View style={styles.pill} />
          </Animated.View>
        ) : null}
        {tabs}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    paddingTop: t.spacing.xs + 2,
    ...t.elevation(2),
  },
  row: { flexDirection: 'row', height: t.layout.tabBarHeight - 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  labelActive: { fontFamily: t.fonts.bold },
  pillTrack: { position: 'absolute', top: 4, bottom: 4, alignItems: 'center' },
  pill: {
    width: 64,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.brandSoft,
    marginTop: 0,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginTop: -30,
    backgroundColor: t.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: t.colors.surface,
    ...t.elevation(3),
  },
  fabLabel: { marginTop: 2, fontFamily: t.fonts.bold },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: t.colors.critical,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: t.colors.surface,
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
}));
