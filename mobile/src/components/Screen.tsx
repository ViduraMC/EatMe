import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { makeStyles, useTheme } from '../theme';
import { enterFromBelow, useReducedMotion } from '../theme/animations';

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

  const inner = (
    <>
      <View style={[styles.flex, style]}>{children}</View>
      {footer ? (
        <Animated.View
          entering={enterFromBelow(reduced)}
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
        >
          {footer}
        </Animated.View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

/**
 * The old ScreenContainer API (scroll, avoidKeyboard, edges, style), kept so
 * screens that have not been redesigned yet still compile.
 */
export function ScreenContainer({
  children,
  scroll = false,
  avoidKeyboard = false,
  edges = ['top', 'left', 'right', 'bottom'],
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  avoidKeyboard?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <Screen edges={edges} avoidKeyboard={avoidKeyboard}>
      {scroll ? (
        <Animated.ScrollView
          contentContainerStyle={[styles.padded, style]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={[styles.flex, styles.padded, style]}>{children}</View>
      )}
    </Screen>
  );
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
 * A slim bar pinned to the top of a tab. Its title and hairline fade in only
 * once the large title has scrolled away.
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
    borderBottomColor: scrollY.value > 60 ? theme.colors.border : 'transparent',
  }));

  return (
    <Animated.View style={[styles.topBar, barStyle]}>
      <Animated.View
        style={[styles.flex, titleStyle]}
        importantForAccessibility="no-hide-descendants"
      >
        <AppText variant="subtitle" numberOfLines={1}>
          {title}
        </AppText>
      </Animated.View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1 },
  padded: { flexGrow: 1, padding: t.layout.screenPadding },
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
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.md,
  },
  subtitle: { marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.layout.screenPadding,
    backgroundColor: t.colors.background,
    borderBottomWidth: 1,
    zIndex: 2,
  },
}));
