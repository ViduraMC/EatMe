import React, { useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { AppText, Button, Illustration, Screen, type ArtName } from '../../components';
import { useOnboarding } from '../../context/OnboardingContext';
import { useI18n, type TKey } from '../../i18n';
import { makeStyles, useTheme } from '../../theme';
import { haptics } from '../../utils/haptics';

interface Slide {
  art: ArtName;
  title: TKey;
  body: TKey;
}

const SLIDES: Slide[] = [
  { art: 'shareFood', title: 'onboarding.slide1Title', body: 'onboarding.slide1Body' },
  { art: 'requestFood', title: 'onboarding.slide2Title', body: 'onboarding.slide2Body' },
  { art: 'deliverFood', title: 'onboarding.slide3Title', body: 'onboarding.slide3Body' },
];

/**
 * Three slides that explain the whole loop (share, request, deliver) before
 * anyone is asked to sign up. Knowing where they fit makes the role choice
 * on the next screen obvious.
 *
 * Swiping moves the illustration a little slower than the text (parallax),
 * the background tint follows the slide, and the dots stretch to show the
 * current position. "Skip" is always available: this is information, not a
 * gate.
 */
export function IntroScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const { complete } = useOnboarding();
  const { width } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const pager = useRef<Animated.ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const tints = [theme.colors.brandSoft, theme.colors.oliveSoft, theme.colors.brandSoft];
  const backdrop = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollX.value,
      SLIDES.map((_, i) => i * width),
      tints,
    ),
  }));

  function next() {
    if (last) {
      haptics.success();
      complete();
      return;
    }
    pager.current?.scrollTo({ x: (page + 1) * width, animated: true });
  }

  return (
    <Screen
      edges={['top', 'left', 'right']}
      footer={
        <View style={styles.footerRow}>
          <View style={styles.flex}>
            {last ? null : (
              <Button
                label={t('common.skip')}
                variant="ghost"
                inline
                onPress={complete}
              />
            )}
          </View>
          <Dots scrollX={scrollX} width={width} />
          {/* The last button's label is longest ("Get started", and more so
              in Sinhala), so it gets the space Skip no longer needs. */}
          <View style={last ? styles.flexWide : styles.flex}>
            <Button
              label={last ? t('onboarding.getStarted') : t('common.next')}
              iconRight={last ? undefined : 'arrow-forward'}
              inline
              onPress={next}
              style={styles.nextButton}
            />
          </View>
        </View>
      }
    >
      <Animated.View style={[styles.backdrop, backdrop]} />
      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / width);
          if (p !== page) haptics.selection();
          setPage(p);
        }}
      >
        {SLIDES.map((slide, i) => (
          <SlideView
            key={slide.art}
            slide={slide}
            index={i}
            scrollX={scrollX}
            width={width}
          />
        ))}
      </Animated.ScrollView>
    </Screen>
  );
}

function SlideView({
  slide,
  index,
  scrollX,
  width,
}: {
  slide: Slide;
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const range = [(index - 1) * width, index * width, (index + 1) * width];

  const artStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          range,
          [width * 0.35, 0, -width * 0.35],
          Extrapolation.CLAMP,
        ),
      },
      { scale: interpolate(scrollX.value, range, [0.85, 1, 0.85], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
  }));
  const textStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollX.value, range, [24, 0, 24], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View
      style={[styles.slide, { width }]}
      accessible
      accessibilityLabel={`${t(slide.title)}. ${t(slide.body)}`}
      accessibilityHint={t('onboarding.slideOf', { n: index + 1, total: SLIDES.length })}
    >
      {/* The art sits inside the coloured panel and the text below it; they
          share the panel's height so a long (or Sinhala) title can never
          run into the panel's curved edge. */}
      <Animated.View style={[styles.artWrap, artStyle]}>
        <Illustration name={slide.art} width={Math.min(300, width * 0.78)} />
      </Animated.View>
      <Animated.View style={[styles.text, textStyle]}>
        <AppText variant="title" align="center">
          {t(slide.title)}
        </AppText>
        <AppText variant="body" color="textSecondary" align="center" style={styles.body}>
          {t(slide.body)}
        </AppText>
      </Animated.View>
    </View>
  );
}

/** Page dots: the current one stretches into a pill. */
function Dots({ scrollX, width }: { scrollX: SharedValue<number>; width: number }) {
  const styles = useStyles();
  return (
    <View style={styles.dots} importantForAccessibility="no-hide-descendants">
      {SLIDES.map((s, i) => (
        <Dot key={s.art} index={i} scrollX={scrollX} width={width} />
      ))}
    </View>
  );
}

function Dot({
  index,
  scrollX,
  width,
}: {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}) {
  const theme = useTheme();
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, range, [8, 26, 8], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(scrollX.value, range, [
      theme.colors.borderStrong,
      theme.colors.brand,
      theme.colors.borderStrong,
    ]),
  }));
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />;
}

/** Height of the coloured panel behind the art, shared by art and backdrop. */
const PANEL = '56%' as const;

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  flexWide: { flex: 2 },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PANEL,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
  },
  slide: {
    flex: 1,
    paddingHorizontal: t.layout.screenPadding + 8,
  },
  artWrap: {
    height: PANEL,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: t.spacing.md,
  },
  text: { flex: 1, gap: t.spacing.sm, paddingTop: t.spacing.xl },
  body: { marginTop: t.spacing.xs },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.sm,
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  nextButton: { alignSelf: 'flex-end' },
}));
