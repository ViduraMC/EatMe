import React, { useEffect, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, type Theme } from '../../theme';
import { ART, logoMark, type ArtColors, type ArtName } from './art';

export type { ArtName } from './art';

/** Maps the theme palette onto the illustration colour slots. */
export function artColors(theme: Theme): ArtColors {
  const c = theme.colors;
  return theme.isDark
    ? {
        blob: c.brandSoft,
        blobAlt: c.oliveSoft,
        primary: c.brand,
        primaryDark: c.brandPressed,
        // Brighter than the olive token (which is tuned for white button
        // labels), so leaves and hearts don't sink into the dark panel.
        secondary: '#8C9D56',
        secondaryDark: '#6E7E3E',
        accent: c.urgent,
        cream: '#F3E6D2',
        line: '#120C08',
        faint: '#4A433C',
      }
    : {
        blob: c.brandSoft,
        blobAlt: c.oliveSoft,
        primary: c.brand,
        primaryDark: c.brandPressed,
        secondary: c.olive,
        secondaryDark: c.oliveText,
        // A brighter saffron than the urgency token: this is decoration, not a warning.
        accent: '#E8A33D',
        cream: '#FFF4E2',
        line: '#4A3A2E',
        faint: '#D9C8B3',
      };
}

interface IllustrationProps {
  name: ArtName;
  /** Width in points; height follows the 4:3 canvas. */
  width?: number;
  /** Drift gently up and down. Off automatically with reduced motion. */
  float?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders one of the EatMe illustrations in the current theme's colours.
 * Decorative: hidden from screen readers, because the title and message
 * beside it carry the meaning.
 */
export function Illustration({
  name,
  width = 220,
  float = true,
  style,
}: IllustrationProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const xml = useMemo(() => ART[name](artColors(theme)), [name, theme]);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!float || reduced) {
      y.value = 0;
      return;
    }
    y.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [float, reduced, y]);

  const drift = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View
      style={[{ width, height: (width * 3) / 4 }, drift, style]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <SvgXml xml={xml} width="100%" height="100%" />
    </Animated.View>
  );
}

/** The logo mark alone: a bowl with a heart rising from it. */
export function LogoMark({
  size = 48,
  inverse = false,
}: {
  size?: number;
  inverse?: boolean;
}) {
  const theme = useTheme();
  const xml = useMemo(
    () =>
      logoMark(
        inverse
          ? { bowl: '#FFFFFF', rim: 'rgba(255,255,255,0.75)', heart: '#FFE7C2' }
          : {
              bowl: theme.colors.brand,
              rim: theme.colors.brandPressed,
              heart: theme.colors.olive,
            },
      ),
    [inverse, theme],
  );
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
}
