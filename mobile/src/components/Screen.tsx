import React, { useEffect, useState } from 'react';
import { Keyboard, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { KeyboardAvoider } from './KeyboardAvoider';
import { makeStyles, useTheme } from '../theme';
import { enterFromBelow, useReducedMotion } from '../theme/animations';
import { scheduleOnRN } from 'react-native-worklets';

interface ScreenProps {
  children: React.ReactNode;
  edges?: readonly Edge[];
  /** Lift content (and the footer) above the keyboard. */
  avoidKeyboard?: boolean;
  /** Sticky bottom area for the screen's main action. */
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The outer frame of every screen: safe area, background, keyboard
 * handling, and an optional sticky footer for the primary action.
 *
 * Keeping the main action in a sticky footer means it is always in the same
 * place (bottom, within thumb reach) and never scrolls away on a long form.
 */
export function Screen({
  children,
  edges = ['top', 'left', 'right'],
  avoidKeyboard = false,
  footer,
  style,
}: ScreenProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // While the keyboard is up the footer sits on top of it, so the gap kept
  // for the phone's gesture bar is no longer needed.
  const keyboardUp = useKeyboardVisible(avoidKeyboard);

  const inner = (
    <>
      <View style={[styles.flex, style]}>{children}</View>
      {footer ? (
        <Animated.View
          entering={enterFromBelow(reduced)}
          style={[
            styles.footer,
            { paddingBottom: keyboardUp ? 12 : Math.max(insets.bottom, 12) + 4 },
          ]}
        >
          {footer}
        </Animated.View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {avoidKeyboard ? <KeyboardAvoider>{inner}</KeyboardAvoider> : inner}
    </SafeAreaView>
  );
}

function useKeyboardVisible(enabled: boolean): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [enabled]);
  return visible;
}

/** Tracks vertical scroll on the UI thread, for collapsing headers. */
export function useScrollY(): {
  scrollY: SharedValue<number>;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
} {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  return { scrollY, onScroll };
}

interface LargeTitleProps {
  title: string;
  /** Small line above the title, e.g. the greeting. */
  eyebrow?: string;
  subtitle?: string;
  /** Actions on the right, e.g. an avatar or a filter button. */
  right?: React.ReactNode;
  scrollY?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
}

/**
 * The large serif title at the top of a tab. As the list scrolls it drifts
 * up and fades, handing over to the compact TopBar title, so there is always
 * a title on screen but it only takes space when there is space to give.
 */
export function LargeTitle({
  title,
  eyebrow,
  subtitle,
  right,
  scrollY,
  style,
}: LargeTitleProps) {
  const styles = useStyles();
  const fade = useAnimatedStyle(() => {
    if (!scrollY) return {};
    return {
      opacity: interpolate(scrollY.value, [0, 70], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollY.value, [0, 70], [0, -10], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.largeTitle, fade, style]}>
      <View style={styles.flex}>
        {eyebrow ? (
          <AppText variant="secondaryStrong" color="textSecondary">
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="secondary" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </Animated.View>
  );
}

/**
 * A slim bar pinned over the top of a tab. It takes no space while the large
 * title is showing; its background, title and actions fade in only once the
 * large title has scrolled away. (It used to reserve 52dp of empty space and
 * repeat the large title's avatar, so tabs showed two avatars and a gap.)
 */
export function TopBar({
  title,
  scrollY,
  right,
}: {
  title: string;
  scrollY: SharedValue<number>;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [40, 80], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [40, 80], [6, 0], Extrapolation.CLAMP) },
    ],
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 70], [0, 1], Extrapolation.CLAMP),
    borderBottomColor: scrollY.value > 60 ? theme.colors.border : 'transparent',
  }));
  // Actions only take touches once they are visible, so the invisible bar
  // never swallows taps meant for the large title underneath.
  const [shown, setShown] = useState(false);
  useAnimatedReaction(
    () => scrollY.value > 50,
    (now, before) => {
      if (now !== before) scheduleOnRN(setShown, now);
    },
  );

  return (
    <View style={styles.topBarWrap} pointerEvents="box-none">
      <Animated.View style={[styles.topBarBg, barStyle]} pointerEvents="none" />
      <View style={styles.topBar} pointerEvents="box-none">
        <Animated.View
          style={[styles.flex, titleStyle]}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          <AppText variant="subtitle" numberOfLines={1}>
            {title}
          </AppText>
        </Animated.View>
        {right ? (
          <Animated.View
            style={[styles.right, titleStyle]}
            pointerEvents={shown ? 'auto' : 'none'}
          >
            {right}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1 },
  footer: {
    paddingHorizontal: t.layout.screenPadding,
    paddingTop: t.spacing.sm + 4,
    backgroundColor: t.colors.background,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    gap: t.spacing.sm,
  },
  largeTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: t.spacing.md,
    paddingTop: t.spacing.md + 4,
    paddingBottom: t.spacing.md,
  },
  subtitle: { marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 },
  topBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.background,
    borderBottomWidth: 1,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.layout.screenPadding,
  },
}));
