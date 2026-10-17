import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText, LogoMark } from '../../components';
import { useTheme } from '../../theme';
import { useT } from '../../i18n';

/**
 * Shown while the saved session is checked on launch.
 *
 * It continues the native splash (same terracotta), then gives the brand a
 * moment: the bowl springs in, the name and tagline rise after it, and soft
 * "steam" bubbles drift up behind. It never adds artificial delay; it is only
 * on screen for as long as the session check takes.
 */
export function SplashScreen() {
  const theme = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.6);
  const opacity = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, theme.motion.spring.bouncy);
  }, [reduced, opacity, scale, theme.motion.spring.bouncy]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <LinearGradient
      colors={[theme.colors.heroGradient[0], theme.colors.heroGradient[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      {!reduced ? (
        <>
          <Bubble x={0.18} size={90} delay={0} />
          <Bubble x={0.72} size={130} delay={700} />
          <Bubble x={0.45} size={60} delay={1400} />
        </>
      ) : null}
      <View
        style={styles.center}
        accessible
        accessibilityRole="image"
        accessibilityLabel="EatMe"
      >
        <Animated.View style={markStyle}>
          <LogoMark size={112} inverse />
        </Animated.View>
        <Animated.View entering={reduced ? undefined : FadeInUp.delay(180).duration(420)}>
          <AppText
            variant="display"
            color="#FFFFFF"
            style={{
              fontFamily: 'Fraunces-Bold',
              fontSize: 44,
              lineHeight: 52,
              marginTop: 12,
            }}
          >
            EatMe
          </AppText>
        </Animated.View>
        <Animated.View entering={reduced ? undefined : FadeInUp.delay(360).duration(420)}>
          <AppText
            variant="callout"
            color="rgba(255,255,255,0.88)"
            align="center"
            style={styles.tagline}
          >
            {t('common.tagline')}
          </AppText>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

/** A translucent circle that rises and fades on a loop, like steam off a bowl. */
function Bubble({ x, size, delay }: { x: number; size: number; delay: number }) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.16 * Math.sin(progress.value * Math.PI),
    transform: [
      { translateY: -progress.value * height * 0.35 },
      { scale: 0.8 + progress.value * 0.4 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: width * x - size / 2,
          top: height * 0.62,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  tagline: { marginTop: 6, maxWidth: 280 },
});
