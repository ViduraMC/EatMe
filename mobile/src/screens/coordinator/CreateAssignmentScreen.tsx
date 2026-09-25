import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  Icon,
  InfoBanner,
  Screen,
  SkeletonList,
  TextField,
  useToast,
} from '../../components';
import {
  createAssignment,
  fetchAssignmentQueue,
  fetchDrivers,
} from '../../api/assignments.api';
import { useI18n, type TKey } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles } from '../../theme';
import { enterSection, useReducedMotion } from '../../theme/animations';
import type { AssignmentQueueRequest, DriverInfo } from '../../types/assignment';
import type { CoordinatorStackProps } from '../../navigation/types';
import { DriverPicker } from './components/DriverPicker';

const NOTE_IDEAS: TKey[] = [
  'coordinator.noteIdea1',
  'coordinator.noteIdea2',
  'coordinator.noteIdea3',
];

/**
 * Matching a request with a driver.
 *
 * The request is summarised at the top so the coordinator never has to
 * remember what they tapped, and the button names the person ("Assign to
 * Sunil") so the choice is read back before it is made.
 */
export function CreateAssignmentScreen({
  navigation,
  route,
}: CoordinatorStackProps<'CreateAssignment'>) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const reduced = useReducedMotion();
  const { requestId } = route.params;

  const [request, setRequest] = useState<AssignmentQueueRequest | null>(null);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [queue, list] = await Promise.all([fetchAssignmentQueue(), fetchDrivers()]);
      setRequest(queue.find((r) => r.requestId === requestId) ?? null);
      setDrivers(list);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const selected = drivers.find((d) => d.userId === selectedId) ?? null;

  async function assign() {
    if (!selected) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await createAssignment({
        requestId,
        driverId: selected.userId,
        noteToDriver: note.trim() || null,
      });
      toast.show({
        type: 'success',
        title: t('coordinator.assignedToast', { name: selected.name }),
        message: t('coordinator.assignedBody'),
      });
      navigation.goBack();
    } catch (err) {
      setFormError(describeError(err, t).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen edges={['left', 'right']}>
        <View style={styles.content}>
          <SkeletonList count={3} />
        </View>
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState error={error} onRetry={() => void load()} />
      </Screen>
    );
  }
  if (!request) {
    return (
      <Screen edges={['left', 'right']}>
        <EmptyState
          illustration="allClear"
          title={t('coordinator.requestGone')}
          actionLabel={t('common.back')}
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const who = request.recipient.organisationName ?? request.recipient.name;

  return (
    <Screen
      edges={['left', 'right']}
      avoidKeyboard
      footer={
        <Button
          label={
            selected
              ? t('coordinator.assignTo', { name: selected.name })
              : t('coordinator.chooseDriver')
          }
          icon="mc:truck-check-outline"
          size="lg"
          onPress={() => void assign()}
          loading={submitting}
          disabled={!selected}
        />
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enterSection(0, reduced)}>
          <Card variant="tinted">
            <View style={styles.head}>
              <Avatar name={who} size={40} icon="mc:home-heart" />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{who}</AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {t('coordinator.fromListing', { title: request.listing.title })}
                </AppText>
              </View>
            </View>
            <View style={styles.lines}>
              {request.items.map((line) => (
                <View key={line.requestItemId} style={styles.line}>
                  <Icon name="ellipse" size={6} color="brand" />
                  <AppText variant="secondary" numberOfLines={1} style={styles.flex}>
                    {line.item.foodName}
                  </AppText>
                  <AppText variant="secondaryStrong">
                    {f.quantity(line.quantityRequested, line.item.unit)}
                  </AppText>
                </View>
              ))}
            </View>
            <View style={styles.route}>
              <Icon name="location-outline" size={16} color="brandText" />
              <AppText variant="caption" color="textSecondary" style={styles.flex}>
                {`${request.listing.pickupAddress} · ${f.window(request.listing.pickupWindowStart, request.listing.pickupWindowEnd)}`}
              </AppText>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={enterSection(1, reduced)}>
          <AppText variant="headline" accessibilityRole="header" style={styles.title}>
            {t('coordinator.assignTitle')}
          </AppText>
          <AppText variant="secondary" color="textSecondary" style={styles.subtitle}>
            {t('coordinator.assignSubtitle')}
          </AppText>
          <DriverPicker
            drivers={drivers}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </Animated.View>

        <TextField
          containerStyle={styles.note}
          label={t('coordinator.noteLabel')}
          optional
          value={note}
          onChangeText={setNote}
          placeholder={t('coordinator.notePlaceholder')}
          multiline
          maxLength={1000}
        />
        <ChipRow>
          {NOTE_IDEAS.map((key) => (
            <Chip
              key={key}
              label={t(key)}
              icon="chatbubble-outline"
              tone="olive"
              selected={note === t(key)}
              onPress={() => setNote(t(key))}
            />
          ))}
        </ChipRow>

        {formError ? (
          <InfoBanner tone="critical" message={formError} style={styles.error} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.layout.screenPadding, paddingBottom: t.spacing.xxl },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  lines: { marginTop: t.spacing.sm + 4, gap: t.spacing.xs + 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  route: { flexDirection: 'row', gap: t.spacing.xs + 2, marginTop: t.spacing.sm + 4 },
  title: { marginTop: t.spacing.md },
  subtitle: { marginTop: 2, marginBottom: t.spacing.sm },
  note: { marginTop: t.spacing.lg },
  error: { marginTop: t.spacing.md },
}));
