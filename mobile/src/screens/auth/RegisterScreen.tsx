import React, { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import Animated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  FormScrollView,
  AppText,
  Button,
  ChoiceCard,
  IconButton,
  InfoBanner,
  ProgressBar,
  Screen,
  TextField,
  useToast,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type TKey } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { makeStyles, type Tone } from '../../theme';
import { useReducedMotion } from '../../theme/animations';
import { haptics } from '../../utils/haptics';
import type { RegisterableRole } from '../../types';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTAL_STEPS = 3;

type Field = 'name' | 'phone' | 'address' | 'email' | 'password' | 'role';
type Errors = Partial<Record<Field, TKey>>;

/** 0 to 4, from length and character variety. Shown as a bar, never blocks sign-up. */
function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return pw.length < 8 ? Math.min(score, 1) : score;
}

const STRENGTH: { label: TKey; tone: Tone }[] = [
  { label: 'auth.strengthWeak', tone: 'critical' },
  { label: 'auth.strengthWeak', tone: 'critical' },
  { label: 'auth.strengthFair', tone: 'urgent' },
  { label: 'auth.strengthGood', tone: 'safe' },
  { label: 'auth.strengthStrong', tone: 'olive' },
];

/**
 * Sign-up in three short steps instead of one long form: who you are, about
 * you, then securing the account. Short steps feel quicker, each one can be
 * checked on its own, and the progress bar says how much is left.
 *
 * Field rules match the API's registerSchema, so problems are caught as the
 * user goes, in their language, instead of after they press submit.
 */
export function RegisterScreen({ navigation }: Props) {
  const styles = useStyles();
  const { t } = useI18n();
  const toast = useToast();
  const reduced = useReducedMotion();
  const { register, isSubmitting } = useAuth();

  const [step, setStep] = useState(1);
  const direction = useRef<1 | -1>(1);
  const [role, setRole] = useState<RegisterableRole | null>(null);
  const [name, setName] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const orgRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  function validate(forStep: number): Errors {
    const e: Errors = {};
    if (forStep === 1 && !role) e.role = 'auth.chooseRole';
    if (forStep === 2) {
      if (name.trim().length < 2) e.name = 'auth.nameShort';
      if (phone.replace(/\D/g, '').length < 9) e.phone = 'auth.phoneInvalid';
      if (address.trim().length < 5) e.address = 'auth.addressShort';
    }
    if (forStep === 3) {
      if (!email.trim()) e.email = 'auth.emailRequired';
      else if (!EMAIL.test(email.trim())) e.email = 'auth.emailInvalid';
      if (password.length < 8) e.password = 'auth.passwordShort';
    }
    return e;
  }

  function go(next: number) {
    direction.current = next > step ? 1 : -1;
    setErrors({});
    setFormError(null);
    setStep(next);
  }

  function onNext() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      haptics.error();
      return;
    }
    if (step < TOTAL_STEPS) {
      haptics.selection();
      go(step + 1);
    } else {
      void submit();
    }
  }

  async function submit() {
    if (!role) return;
    setFormError(null);
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        address: address.trim(),
        role,
        ...(organisationName.trim() ? { organisationName: organisationName.trim() } : {}),
      });
      if (user.status === 'pending') {
        navigation.replace('RegisterPending', {
          name: user.name.split(' ')[0] ?? user.name,
          organisation: user.organisationName ?? user.name,
        });
      } else {
        toast.show({
          type: 'success',
          title: t('auth.welcome', { name: user.name.split(' ')[0] ?? user.name }),
        });
      }
    } catch (err) {
      setFormError(describeError(err, t).message);
    }
  }

  const err = (f: Field) => (errors[f] ? t(errors[f]!) : undefined);
  const score = passwordScore(password);
  const strength = STRENGTH[score]!;

  const entering = reduced
    ? FadeIn.duration(150)
    : (direction.current > 0 ? SlideInRight : SlideInLeft).duration(280);
  const exiting = reduced
    ? undefined
    : (direction.current > 0 ? SlideOutLeft : SlideOutRight).duration(220);

  return (
    <Screen
      edges={['top', 'left', 'right']}
      avoidKeyboard
      footer={
        <View style={styles.footerRow}>
          {step > 1 ? (
            <Button
              label={t('common.back')}
              variant="secondary"
              onPress={() => go(step - 1)}
              style={styles.flex}
            />
          ) : null}
          <Button
            label={step === TOTAL_STEPS ? t('auth.submit') : t('common.next')}
            iconRight={step === TOTAL_STEPS ? 'checkmark' : 'arrow-forward'}
            onPress={onNext}
            loading={isSubmitting}
            style={styles.flexWide}
          />
        </View>
      }
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          variant="tonal"
          size="sm"
          onPress={() => navigation.goBack()}
          accessibilityLabel={t('common.close')}
        />
        <View style={styles.progress}>
          <AppText variant="caption" color="textSecondary">
            {t('auth.stepOf', { step, total: TOTAL_STEPS })}
          </AppText>
          <ProgressBar
            value={step / TOTAL_STEPS}
            height={6}
            accessibilityLabel={t('auth.stepOf', { step, total: TOTAL_STEPS })}
          />
        </View>
      </View>

      <FormScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={step} entering={entering} exiting={exiting}>
          {step === 1 ? (
            <>
              <AppText variant="title" accessibilityRole="header">
                {t('auth.roleQuestion')}
              </AppText>
              <View style={styles.gap} />
              <ChoiceCard
                title={t('auth.donorTitle')}
                description={t('auth.donorBody')}
                icon="mc:hand-heart-outline"
                tone="brand"
                selected={role === 'donor'}
                onPress={() => {
                  setRole('donor');
                  setErrors({});
                }}
              />
              <ChoiceCard
                title={t('auth.recipientTitle')}
                description={t('auth.recipientBody')}
                icon="mc:home-heart"
                tone="olive"
                selected={role === 'recipient'}
                onPress={() => {
                  setRole('recipient');
                  setErrors({});
                }}
              />
              {errors.role ? (
                <InfoBanner tone="critical" message={t(errors.role)} />
              ) : null}
              <InfoBanner
                tone="neutral"
                icon="people-outline"
                message={t('auth.staffNote')}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <AppText
                variant="title"
                accessibilityRole="header"
                style={styles.stepTitle}
              >
                {t('auth.aboutYou')}
              </AppText>
              <TextField
                label={t('auth.fullName')}
                icon="person-outline"
                value={name}
                onChangeText={setName}
                error={err('name')}
                placeholder={t('auth.namePlaceholder')}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => orgRef.current?.focus()}
              />
              <TextField
                ref={orgRef}
                label={t('auth.organisation')}
                icon="business-outline"
                optional
                value={organisationName}
                onChangeText={setOrganisationName}
                helper={t('auth.orgHelper')}
                placeholder={
                  role === 'recipient'
                    ? t('auth.orgRecipientPlaceholder')
                    : t('auth.orgDonorPlaceholder')
                }
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
              <TextField
                ref={phoneRef}
                label={t('auth.phone')}
                icon="call-outline"
                value={phone}
                onChangeText={setPhone}
                error={err('phone')}
                helper={t('auth.phoneHelper')}
                placeholder={t('auth.phonePlaceholder')}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
                onSubmitEditing={() => addressRef.current?.focus()}
              />
              <TextField
                ref={addressRef}
                label={t('auth.address')}
                icon="location-outline"
                value={address}
                onChangeText={setAddress}
                error={err('address')}
                helper={t('auth.addressHelper')}
                placeholder={t('auth.addressPlaceholder')}
                autoComplete="street-address"
                multiline
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <AppText
                variant="title"
                accessibilityRole="header"
                style={styles.stepTitle}
              >
                {t('auth.secureTitle')}
              </AppText>
              {formError ? <InfoBanner tone="critical" message={formError} /> : null}
              <TextField
                label={t('auth.email')}
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                error={err('email')}
                placeholder={t('auth.emailPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <TextField
                ref={passwordRef}
                label={t('auth.password')}
                icon="lock-closed-outline"
                secure
                value={password}
                onChangeText={setPassword}
                error={err('password')}
                helper={t('auth.passwordHelper')}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={onNext}
              />
              {password.length > 0 ? (
                <View
                  style={styles.strength}
                  accessible
                  accessibilityLabel={t('auth.strengthLabel', {
                    level: t(strength.label),
                  })}
                >
                  <ProgressBar
                    value={Math.max(score, 1) / 4}
                    tone={strength.tone}
                    height={6}
                    style={styles.flex}
                  />
                  <AppText variant="caption" color="textSecondary">
                    {t(strength.label)}
                  </AppText>
                </View>
              ) : null}
            </>
          ) : null}
        </Animated.View>

        <View style={styles.signInRow}>
          <AppText variant="secondary" color="textSecondary">
            {t('auth.haveAccount')}
          </AppText>
          <Button
            label={t('auth.signIn')}
            variant="ghost"
            inline
            size="sm"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </FormScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.layout.screenPadding,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.md,
  },
  progress: { flex: 1, gap: t.spacing.xs + 2 },
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xl,
    flexGrow: 1,
  },
  gap: { height: t.spacing.lg },
  stepTitle: { marginBottom: t.spacing.lg },
  footerRow: { flexDirection: 'row', gap: t.spacing.sm + 4 },
  flex: { flex: 1 },
  flexWide: { flex: 2 },
  strength: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    marginTop: -t.spacing.sm,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    marginTop: t.spacing.lg,
  },
}));
