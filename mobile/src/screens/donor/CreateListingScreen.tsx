import React, { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  FormScrollView,
  AppText,
  Button,
  Chip,
  ChipRow,
  DateTimeField,
  ProgressBar,
  Screen,
  SectionHeader,
  TextField,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type TKey } from '../../i18n';
import { makeStyles } from '../../theme';
import { enterSection, useReducedMotion } from '../../theme/animations';
import { haptics } from '../../utils/haptics';
import type { DonorStackProps } from '../../navigation/types';

type Field = 'title' | 'address' | 'start' | 'end';
type Errors = Partial<Record<Field, TKey>>;

const HOUR = 3_600_000;

/** The next half hour after now, plus 30 minutes: a realistic earliest pickup. */
function defaultStart(): Date {
  const d = new Date(Date.now() + 30 * 60_000);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  return d;
}

const IDEAS: TKey[] = ['donor.idea1', 'donor.idea2', 'donor.idea3'];

/**
 * Step 1 of 2: what is being shared, where, and when it can be collected.
 *
 * Everything that can be defaulted is: the pickup address is the donor's
 * own, and the window starts shortly and lasts two hours. The fastest path
 * is "type a title, tap Next". Donors only change what differs from the
 * usual.
 *
 * Dates are picked, not typed, so an impossible window (ending before it
 * starts, starting in the past) cannot be entered.
 */
export function CreateListingScreen({ navigation }: DonorStackProps<'CreateListing'>) {
  const styles = useStyles();
  const { t } = useI18n();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const descRef = useRef<TextInput>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState(user?.address ?? '');
  const [start, setStart] = useState<Date | null>(defaultStart);
  const [end, setEnd] = useState<Date | null>(
    () => new Date(defaultStart().getTime() + 2 * HOUR),
  );
  const [errors, setErrors] = useState<Errors>({});

  function validate(): Errors {
    const e: Errors = {};
    if (title.trim().length < 3) e.title = 'donor.titleShort';
    if (address.trim().length < 5) e.address = 'auth.addressShort';
    if (!start) e.start = 'donor.startRequired';
    else if (start.getTime() < Date.now() - 5 * 60_000) e.start = 'donor.startPast';
    if (!end) e.end = 'donor.endRequired';
    else if (start && end.getTime() <= start.getTime()) e.end = 'donor.endBeforeStart';
    return e;
  }

  function onNext() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0 || !start || !end) {
      haptics.error();
      return;
    }
    navigation.navigate('AddItems', {
      title: title.trim(),
      description: description.trim(),
      pickupAddress: address.trim(),
      pickupWindowStart: start.toISOString(),
      pickupWindowEnd: end.toISOString(),
    });
  }

  function setDuration(hours: number) {
    if (!start) return;
    setEnd(new Date(start.getTime() + hours * HOUR));
    setErrors((e) => ({ ...e, end: undefined }));
  }

  const err = (f: Field) => (errors[f] ? t(errors[f]!) : undefined);
  const endHours =
    start && end ? Math.round((end.getTime() - start.getTime()) / HOUR) : null;

  return (
    <Screen
      edges={['left', 'right']}
      avoidKeyboard
      footer={
        <Button
          label={t('donor.nextAddFood')}
          iconRight="arrow-forward"
          size="lg"
          onPress={onNext}
        />
      }
    >
      <FormScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progress}>
          <AppText variant="caption" color="textSecondary">
            {t('auth.stepOf', { step: 1, total: 2 })}
          </AppText>
          <ProgressBar value={0.5} height={6} />
        </View>

        <Animated.View entering={enterSection(0, reduced)}>
          <AppText variant="title" accessibilityRole="header">
            {t('donor.createTitle')}
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.subtitle}>
            {t('donor.createSubtitle')}
          </AppText>
        </Animated.View>

        <Animated.View entering={enterSection(1, reduced)}>
          <TextField
            label={t('donor.titleLabel')}
            icon="pricetag-outline"
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
            }}
            error={err('title')}
            placeholder={t('donor.titlePlaceholder')}
            maxLength={150}
            returnKeyType="next"
            onSubmitEditing={() => descRef.current?.focus()}
            clearable
          />
          <AppText variant="caption" color="textSecondary" style={styles.ideasLabel}>
            {t('donor.quickIdeas')}
          </AppText>
          <ChipRow style={styles.ideas}>
            {IDEAS.map((key) => (
              <Chip
                key={key}
                label={t(key)}
                icon="bulb-outline"
                tone="olive"
                selected={title === t(key)}
                onPress={() => {
                  setTitle(t(key));
                  setErrors((e) => ({ ...e, title: undefined }));
                }}
              />
            ))}
          </ChipRow>

          <TextField
            ref={descRef}
            label={t('donor.descriptionLabel')}
            optional
            value={description}
            onChangeText={setDescription}
            placeholder={t('donor.descriptionPlaceholder')}
            multiline
            maxLength={500}
            showCount
          />

          <TextField
            label={t('donor.addressLabel')}
            icon="location-outline"
            value={address}
            onChangeText={(v) => {
              setAddress(v);
              if (errors.address) setErrors((e) => ({ ...e, address: undefined }));
            }}
            error={err('address')}
            multiline
          />
          {user?.address && address.trim() !== user.address.trim() ? (
            <Chip
              label={t('donor.useMyAddress')}
              icon="home-outline"
              onPress={() => setAddress(user.address)}
              style={styles.useMine}
            />
          ) : null}
        </Animated.View>

        <Animated.View entering={enterSection(2, reduced)}>
          <SectionHeader title={t('donor.windowTitle')} />
          <AppText variant="secondary" color="textSecondary" style={styles.windowHelp}>
            {t('donor.windowHelp')}
          </AppText>
          <DateTimeField
            label={t('donor.windowStart')}
            value={start}
            minimum={new Date(Date.now() - 5 * 60_000)}
            error={err('start')}
            onChange={(d) => {
              const duration = start && end ? end.getTime() - start.getTime() : 2 * HOUR;
              setStart(d);
              // Keep the same length of window when the start moves.
              setEnd(new Date(d.getTime() + Math.max(duration, HOUR)));
              setErrors((e) => ({ ...e, start: undefined, end: undefined }));
            }}
          />
          <DateTimeField
            label={t('donor.windowEnd')}
            value={end}
            minimum={start ? new Date(start.getTime() + 30 * 60_000) : undefined}
            error={err('end')}
            onChange={(d) => {
              setEnd(d);
              setErrors((e) => ({ ...e, end: undefined }));
            }}
          />
          <ChipRow>
            {[1, 2, 3, 4].map((h) => (
              <Chip
                key={h}
                label={t('donor.plusHours', { count: h })}
                icon="time-outline"
                selected={endHours === h}
                onPress={() => setDuration(h)}
              />
            ))}
          </ChipRow>
        </Animated.View>
      </FormScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.layout.screenPadding, paddingBottom: t.spacing.xxl },
  progress: { gap: t.spacing.xs + 2, marginBottom: t.spacing.lg },
  subtitle: { marginTop: t.spacing.xs, marginBottom: t.spacing.lg },
  ideasLabel: { marginTop: -t.spacing.sm, marginBottom: t.spacing.xs },
  ideas: { marginBottom: t.spacing.lg },
  useMine: {
    alignSelf: 'flex-start',
    marginTop: -t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  windowHelp: { marginTop: -t.spacing.xs, marginBottom: t.spacing.md },
}));
