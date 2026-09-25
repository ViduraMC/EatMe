import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeOut,
  SlideInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme, type Tone } from '../theme';
import { haptics } from '../utils/haptics';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  /** Optional inline action, e.g. "Undo" or "View". */
  actionLabel?: string;
  onAction?: () => void;
  /** Milliseconds before it hides itself. Errors stay longer by default. */
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const LOOK: Record<ToastType, { tone: Tone; icon: IconName }> = {
  success: { tone: 'safe', icon: 'checkmark-circle' },
  error: { tone: 'critical', icon: 'alert-circle' },
  warning: { tone: 'urgent', icon: 'warning' },
  info: { tone: 'info', icon: 'information-circle' },
};

/**
 * Non-blocking feedback that confirms something happened ("Listing posted")
 * without an OK button to dismiss.
 *
 * Toasts replace most of the old Alert.alert calls. A modal alert for good
 * news interrupts the user and makes them tap to continue; a toast tells
 * them and gets out of the way. Anything that needs a decision uses a
 * ConfirmSheet instead.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const type = options.type ?? 'success';
    if (timer.current) clearTimeout(timer.current);
    counter.current += 1;
    setToast({ ...options, type, id: counter.current });

    if (type === 'success') haptics.success();
    else if (type === 'error') haptics.error();
    else if (type === 'warning') haptics.warning();

    AccessibilityInfo.announceForAccessibility(
      options.message ? `${options.title}. ${options.message}` : options.title,
    );

    const duration = options.duration ?? (type === 'error' ? 5500 : 3500);
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      >
        {toast ? <ToastCard key={toast.id} toast={toast} onDismiss={hide} /> : null}
      </View>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const look = LOOK[toast.type ?? 'success'];
  const c = theme.tone(look.tone);
  const y = useSharedValue(0);

  // Swipe up to dismiss early.
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY < -24 || e.velocityY < -500) {
        scheduleOnRN(onDismiss);
      } else {
        y.value = withSpring(0, theme.motion.spring.snappy);
      }
    });

  const drag = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={
          reduced
            ? FadeIn.duration(150)
            : SlideInUp.springify().damping(18).stiffness(200)
        }
        exiting={FadeOut.duration(160)}
        style={[styles.wrap, { top: insets.top + theme.spacing.sm }, drag]}
        accessibilityLiveRegion="polite"
        accessibilityRole={toast.type === 'error' ? 'alert' : undefined}
      >
        <View style={[styles.card, { borderLeftColor: c.accent }]}>
          <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
            <Icon name={look.icon} size={22} color={c.fg} />
          </View>
          <View style={styles.text}>
            <AppText variant="secondaryStrong">{toast.title}</AppText>
            {toast.message ? (
              <AppText variant="caption" color="textSecondary">
                {toast.message}
              </AppText>
            ) : null}
          </View>
          {toast.actionLabel && toast.onAction ? (
            <PressableScale
              onPress={() => {
                toast.onAction?.();
                onDismiss();
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={toast.actionLabel}
            >
              <AppText variant="secondaryStrong" color="brandText">
                {toast.actionLabel}
              </AppText>
            </PressableScale>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

const useStyles = makeStyles((t) => ({
  wrap: { position: 'absolute', left: t.spacing.md, right: t.spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    padding: t.spacing.sm + 4,
    paddingRight: t.spacing.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surfaceElevated,
    borderLeftWidth: 4,
    borderWidth: t.isDark ? 1 : 0,
    borderColor: t.colors.border,
    ...t.elevation(3),
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 1 },
}));
