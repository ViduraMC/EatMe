import React from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppText,
  Button,
  ChoiceCard,
  Illustration,
  Logo,
  Screen,
} from '../../components';
import { LANGUAGES, translate, useI18n, type Language } from '../../i18n';
import { makeStyles } from '../../theme';
import { enterSection, useReducedMotion } from '../../theme/animations';
import type { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Language'>;

const DESCRIPTION: Record<Language, string> = {
  en: 'Continue in English',
  si: 'සිංහලෙන් ඉදිරියට යන්න',
};

/**
 * The very first screen.
 *
 * The heading is written in both languages, because at this point we don't
 * know which one the person reads. Picking a language switches the whole app
 * immediately, so the choice previews itself before they commit.
 */
export function LanguageScreen({ navigation }: Props) {
  const styles = useStyles();
  const { language, setLanguage, t } = useI18n();
  const reduced = useReducedMotion();

  return (
    <Screen
      edges={['top', 'left', 'right']}
      footer={
        <Button
          label={t('common.continue')}
          iconRight="arrow-forward"
          size="lg"
          onPress={() => navigation.navigate('Intro')}
        />
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enterSection(0, reduced)} style={styles.logo}>
          <Logo size={44} />
        </Animated.View>

        <Animated.View entering={enterSection(1, reduced)} style={styles.art}>
          <Illustration name="shareFood" width={250} />
        </Animated.View>

        <Animated.View entering={enterSection(2, reduced)}>
          <AppText variant="title" align="center" accessibilityRole="header" lang="en">
            {translate('en', 'onboarding.languageTitle')}
          </AppText>
          <AppText
            variant="headline"
            align="center"
            color="textSecondary"
            lang="si"
            style={styles.sinhala}
          >
            {translate('si', 'onboarding.languageTitle')}
          </AppText>
        </Animated.View>

        <Animated.View entering={enterSection(3, reduced)} style={styles.options}>
          {LANGUAGES.map((lang) => (
            <ChoiceCard
              key={lang}
              title={translate(lang, `languageNames.${lang}`)}
              description={DESCRIPTION[lang]}
              icon={lang === 'en' ? 'mc:alphabet-latin' : 'mc:translate'}
              lang={lang}
              selected={language === lang}
              onPress={() => setLanguage(lang)}
            />
          ))}
        </Animated.View>

        <View style={styles.hint}>
          <AppText variant="caption" color="textSecondary" align="center">
            {t('onboarding.languageSubtitle')}
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    flexGrow: 1,
    paddingHorizontal: t.layout.screenPadding,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.lg,
  },
  logo: { alignItems: 'center', marginBottom: t.spacing.sm },
  art: { alignItems: 'center', marginVertical: t.spacing.sm },
  sinhala: { marginTop: t.spacing.xs, lineHeight: 34 },
  options: { marginTop: t.spacing.lg },
  hint: { marginTop: t.spacing.sm },
}));
