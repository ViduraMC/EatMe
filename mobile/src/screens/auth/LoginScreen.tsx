import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  View,
  useWindowDimensions,
  type TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppText,
  Button,
  Chip,
  ChipRow,
  Divider,
  InfoBanner,
  Logo,
  TextField,
  useToast,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type TKey } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { makeStyles, useTheme } from '../../theme';
import { enterSection, useReducedMotion } from '../../theme/animations';
import type { AuthStackParamList } from '../../navigation/types';
import type { UserRole } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Seeded accounts, offered only in development builds for demos and testing. */
const DEMO: { role: UserRole; email: string }[] = [
  { role: 'donor', email: 'bakery@eatme.lk' },
  { role: 'recipient', email: 'recipient@eatme.lk' },
  { role: 'coordinator', email: 'coordinator@eatme.lk' },
  { role: 'driver', email: 'driver@eatme.lk' },
  { role: 'admin', email: 'admin@eatme.lk' },
];

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const toast = useToast();
  const { login, isSubmitting } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: TKey; password?: TKey }>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleLogin() {
    setFormError(null);
    const errors: { email?: TKey; password?: TKey } = {};
    if (!email.trim()) errors.email = 'auth.emailRequired';
    else if (!EMAIL.test(email.trim())) errors.email = 'auth.emailInvalid';
    if (!password) errors.password = 'auth.passwordRequired';
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    try {
      const user = await login({ email: email.trim(), password });
      // The root navigator swaps to the role's tabs as soon as the user is set.
      toast.show({
        type: 'success',
        title: t('auth.welcomeBack', { name: user.name.split(' ')[0] ?? user.name }),
      });
    } catch (err) {
      setFormError(describeError(err, t).message);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <LinearGradient
            colors={[theme.colors.heroGradient[0], theme.colors.heroGradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { paddingTop: insets.top + theme.spacing.xl }]}
          >
            <View
              style={[styles.bubble, { width: 180, height: 180, top: -40, right: -50 }]}
            />
            <View
              style={[styles.bubble, { width: 110, height: 110, top: 90, left: -40 }]}
            />
            <Animated.View entering={enterSection(0, reduced)} style={styles.heroContent}>
              <Logo size={56} inverse />
              <AppText
                variant="callout"
                color="rgba(255,255,255,0.9)"
                align="center"
                style={styles.tagline}
              >
                {t('common.tagline')}
              </AppText>
            </Animated.View>
            <Svg
              width={width}
              height={40}
              viewBox={`0 0 ${width} 40`}
              style={styles.wave}
            >
              <Path
                d={`M0 26 C ${width * 0.25} 0, ${width * 0.55} 44, ${width} 14 L ${width} 40 L 0 40 Z`}
                fill={theme.colors.background}
              />
            </Svg>
          </LinearGradient>

          <Animated.View entering={enterSection(1, reduced)} style={styles.form}>
            <AppText variant="title" accessibilityRole="header">
              {t('auth.loginTitle')}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.subtitle}>
              {t('auth.loginSubtitle')}
            </AppText>

            {formError ? <InfoBanner tone="critical" message={formError} /> : null}

            <TextField
              label={t('auth.email')}
              icon="mail-outline"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (fieldErrors.email)
                  setFieldErrors((e) => ({ ...e, email: undefined }));
              }}
              error={fieldErrors.email ? t(fieldErrors.email) : undefined}
              placeholder={t('auth.emailPlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              clearable
            />
            <TextField
              ref={passwordRef}
              label={t('auth.password')}
              icon="lock-closed-outline"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (fieldErrors.password)
                  setFieldErrors((e) => ({ ...e, password: undefined }));
              }}
              error={fieldErrors.password ? t(fieldErrors.password) : undefined}
              placeholder={t('auth.passwordPlaceholder')}
              secure
              autoCapitalize="none"
              textContentType="password"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />

            <Button
              label={t('auth.signIn')}
              size="lg"
              iconRight="arrow-forward"
              onPress={handleLogin}
              loading={isSubmitting}
              style={styles.submit}
            />

            <View style={styles.dividerRow}>
              <Divider style={styles.flex} />
              <AppText variant="secondary" color="textSecondary">
                {t('auth.newHere')}
              </AppText>
              <Divider style={styles.flex} />
            </View>

            <Button
              label={t('auth.createAccount')}
              variant="secondary"
              size="lg"
              icon="person-add-outline"
              onPress={() => navigation.navigate('Register')}
            />

            {__DEV__ ? (
              <View style={styles.demo}>
                <AppText variant="overline" color="textSecondary">
                  {t('auth.demoAccounts')}
                </AppText>
                <AppText variant="caption" color="textTertiary" style={styles.demoHint}>
                  {t('auth.demoHint')}
                </AppText>
                <ChipRow>
                  {DEMO.map((d) => (
                    <Chip
                      key={d.email}
                      label={t(`roles.${d.role}`)}
                      icon="person-outline"
                      selected={email === d.email}
                      onPress={() => {
                        setEmail(d.email);
                        setPassword('Test@1234');
                        setFieldErrors({});
                        setFormError(null);
                      }}
                    />
                  ))}
                </ChipRow>
              </View>
            ) : null}
          </Animated.View>
          <View style={{ height: insets.bottom + theme.spacing.lg }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1 },
  flex: { flex: 1 },
  hero: { paddingBottom: 56, overflow: 'hidden' },
  heroContent: { alignItems: 'center', paddingHorizontal: t.layout.screenPadding },
  tagline: { marginTop: t.spacing.sm, maxWidth: 280 },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  wave: { position: 'absolute', bottom: -1, left: 0 },
  form: { paddingHorizontal: t.layout.screenPadding, paddingTop: t.spacing.sm },
  subtitle: { marginTop: t.spacing.xs, marginBottom: t.spacing.lg },
  submit: { marginTop: t.spacing.xs },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    marginVertical: t.spacing.lg,
  },
  demo: {
    marginTop: t.spacing.xl,
    padding: t.spacing.md,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors.borderStrong,
  },
  demoHint: { marginTop: 2, marginBottom: t.spacing.sm },
}));
