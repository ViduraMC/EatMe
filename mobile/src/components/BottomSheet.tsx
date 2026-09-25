import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { makeStyles, useTheme } from '../theme';
import { useT } from '../i18n';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Sticky actions at the bottom, e.g. Cancel / Confirm. Stays above the keyboard. */
  footer?: React.ReactNode;
  /** Set false while something is submitting, so a stray swipe cannot lose the work. */
  dismissible?: boolean;
  /** Let the content scroll when it is taller than the screen allows. */
  scrollable?: boolean;
}

/**
 * A sheet that rises from the bottom, where the thumb already is.
 *
 * Used for filters, confirmations and short forms (a decline reason). It
 * keeps the screen underneath visible, so the user stays in context, and it
 * can be dragged down to dismiss, closed with the back button, or closed by
 * tapping the dimmed area.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  dismissible = true,
  scrollable = false,
}: BottomSheetProps) {
  const theme = useTheme();
  const styles = useStyles();
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { height: screenH } = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(0);
  const offset = useSharedValue(screenH);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const done = () => setMounted(false);
    backdrop.value = withTiming(0, { duration: theme.motion.duration.fast });
    offset.value = withTiming(
      sheetH || screenH,
      { duration: reduced ? 120 : 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(done);
      },
    );
  }, [
    visible,
    mounted,
    sheetH,
    screenH,
    reduced,
    backdrop,
    offset,
    theme.motion.duration.fast,
  ]);

  // Slide in once the sheet has measured its own height.
  useEffect(() => {
    if (!visible || !mounted || sheetH === 0) return;
    backdrop.value = withTiming(1, { duration: theme.motion.duration.base });
    offset.value = reduced
      ? withTiming(0, { duration: 150 })
      : withSpring(0, { damping: 24, stiffness: 220, mass: 0.9 });
  }, [visible, mounted, sheetH, reduced, backdrop, offset, theme.motion.duration.base]);

  const pan = Gesture.Pan()
    .enabled(dismissible)
    .activeOffsetY(8)
    .onUpdate((e) => {
      offset.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > sheetH * 0.28 || e.velocityY > 900) {
        scheduleOnRN(onClose);
      } else {
        offset.value = withSpring(0, { damping: 24, stiffness: 260 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  const body = scrollable ? (
    <ScrollView
      style={{ maxHeight: screenH * 0.62 }}
      contentContainerStyle={styles.bodyContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.bodyContent}>{children}</View>
  );

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={() => {
        if (dismissible) onClose();
      }}
    >
      {/* Gestures inside an Android Modal need their own root view. */}
      <GestureHandlerRootView style={styles.fill}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable
              style={styles.fill}
              onPress={dismissible ? onClose : undefined}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.closeSheet')}
            />
          </Animated.View>

          <Animated.View
            onLayout={(e: LayoutChangeEvent) => setSheetH(e.nativeEvent.layout.height)}
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, theme.spacing.md),
                maxHeight: screenH * 0.92,
              },
              sheetStyle,
            ]}
            accessibilityViewIsModal
          >
            <GestureDetector gesture={pan}>
              <View style={styles.header}>
                <View style={styles.grabber} />
                {title ? (
                  <View style={styles.titleRow}>
                    <View style={styles.titleText}>
                      <AppText variant="headline" accessibilityRole="header">
                        {title}
                      </AppText>
                      {subtitle ? (
                        <AppText variant="secondary" color="textSecondary">
                          {subtitle}
                        </AppText>
                      ) : null}
                    </View>
                    {dismissible ? (
                      <IconButton
                        icon="close"
                        variant="tonal"
                        size="sm"
                        onPress={onClose}
                        accessibilityLabel={t('a11y.closeSheet')}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </GestureDetector>
            {body}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const StyleFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

const useStyles = makeStyles((t) => ({
  fill: { flex: 1 },
  backdrop: { ...StyleFill, backgroundColor: t.colors.scrim },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.surfaceElevated,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    ...t.elevation(3),
  },
  header: { paddingTop: t.spacing.sm, paddingHorizontal: t.layout.screenPadding },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: t.colors.borderStrong,
    opacity: 0.6,
    marginBottom: t.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  titleText: { flex: 1, gap: 2 },
  bodyContent: { paddingHorizontal: t.layout.screenPadding, paddingBottom: t.spacing.sm },
  footer: {
    paddingHorizontal: t.layout.screenPadding,
    paddingTop: t.spacing.sm,
    gap: t.spacing.sm,
  },
}));
