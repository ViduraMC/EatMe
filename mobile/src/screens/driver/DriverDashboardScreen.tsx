import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  Icon,
  Illustration,
  LargeTitle,
  Screen,
  SkeletonList,
  StatTile,
  TextField,
  Toggle,
  TopBar,
  useScrollY,
  useToast,
} from '../../components';
import {
  acceptAssignmentRequest,
  confirmDropoffRequest,
  confirmPickupRequest,
  declineAssignmentRequest,
  fetchAssignments,
  fetchDriverStats,
  setAvailabilityRequest,
} from '../../api/driver.api';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type TKey } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterSection, useReducedMotion } from '../../theme/animations';
import type { DriverAssignment, DriverStats } from '../../types/driver';
import type { DriverTabProps } from '../../navigation/types';
import { ActiveDeliveryCard } from './components/ActiveDeliveryCard';
import { NewDeliveryCard } from './components/NewDeliveryCard';

const REASONS: TKey[] = [
  'driver.reasonVehicle',
  'driver.reasonFar',
  'driver.reasonBusy',
  'driver.reasonEmergency',
];

/**
 * The driver's home: am I available, is there a new delivery for me, and
 * what am I doing right now.
 *
 * Availability comes first because it decides everything below it. The
 * coordinator only sends deliveries to available drivers, so a driver who
 * wonders "why isn't anything coming?" sees the answer at the top.
 */
export function DriverDashboardScreen(_props: DriverTabProps<'DriverDashboard'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [declining, setDeclining] = useState(false);
  const [delivered, setDelivered] = useState<DriverAssignment | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [list, s] = await Promise.all([fetchAssignments(), fetchDriverStats()]);
      setAssignments(list);
      setStats(s);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const replace = (updated: DriverAssignment) =>
    setAssignments((list) =>
      list.map((a) => (a.assignmentId === updated.assignmentId ? updated : a)),
    );

  const newAssignment = assignments.find((a) => a.status === 'pending_driver');
  const active = assignments.find(
    (a) => a.status === 'accepted' || a.status === 'in_transit',
  );
  const available = !!user?.isAvailable;

  /** Server first, then the session user, so the switch never shows a state the database does not have. */
  async function toggleAvailability(next: boolean) {
    setSavingAvailability(true);
    try {
      const payload = await setAvailabilityRequest(next);
      updateUser({ isAvailable: payload.isAvailable });
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setSavingAvailability(false);
    }
  }

  async function accept() {
    if (!newAssignment) return;
    setAccepting(true);
    try {
      replace(await acceptAssignmentRequest(newAssignment.assignmentId));
      toast.show({
        type: 'success',
        title: t('driver.acceptedToast'),
        message: t('driver.acceptedBody'),
      });
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setAccepting(false);
    }
  }

  async function decline() {
    if (!newAssignment) return;
    if (!reason.trim()) {
      setReasonError(t('driver.reasonRequired'));
      return;
    }
    setDeclining(true);
    try {
      replace(await declineAssignmentRequest(newAssignment.assignmentId, reason.trim()));
      setDeclineOpen(false);
      toast.show({ type: 'success', title: t('driver.declinedToast') });
    } catch (err) {
      setReasonError(describeError(err, t).message);
    } finally {
      setDeclining(false);
    }
  }

  async function confirmPickup() {
    if (!active) return;
    try {
      const updated = await confirmPickupRequest(active.assignmentId);
      toast.show({
        type: 'success',
        title: t('driver.pickupToast'),
        message:
          updated.status === 'in_transit'
            ? t('driver.pickupBoth')
            : t('driver.pickupYou'),
      });
      setTimeout(() => replace(updated), 900);
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
      throw err;
    }
  }

  async function confirmDropoff() {
    if (!active) return;
    try {
      const updated = await confirmDropoffRequest(active.assignmentId);
      setTimeout(() => {
        replace(updated);
        setDelivered(updated);
        void fetchDriverStats()
          .then(setStats)
          .catch(() => undefined);
      }, 700);
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
      throw err;
    }
  }

  const deliveredWhat = delivered
    ? delivered.request.items
        .map((i) => f.quantity(i.quantityRequested, i.item.unit))
        .join(', ')
    : '';

  return (
    <Screen>
      <TopBar title={t('driver.dashboardTitle')} scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.brand}
            colors={[theme.colors.brand]}
          />
        }
      >
        <LargeTitle
          eyebrow={t('donor.greetingName', {
            greeting: f.greeting(),
            name: user?.name.split(' ')[0] ?? '',
          })}
          title={t('driver.dashboardTitle')}
          scrollY={scrollY}
        />

        <Animated.View entering={enterSection(0, reduced)}>
          <Card
            variant="flat"
            style={[styles.availability, available && styles.availabilityOn]}
          >
            <View
              style={[
                styles.availIcon,
                {
                  backgroundColor: available
                    ? theme.colors.olive
                    : theme.colors.surfaceMuted,
                },
              ]}
            >
              <Icon
                name={available ? 'mc:truck-fast' : 'mc:sleep'}
                size={24}
                color={available ? theme.colors.onOlive : 'textSecondary'}
              />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">
                {available ? t('driver.availableTitle') : t('driver.offTitle')}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {available ? t('driver.availableBody') : t('driver.offBody')}
              </AppText>
            </View>
            {savingAvailability ? (
              <ActivityIndicator color={theme.colors.olive} />
            ) : (
              <Toggle
                value={available}
                onChange={(v) => void toggleAvailability(v)}
                tone="olive"
                accessibilityLabel={t('driver.availability')}
              />
            )}
          </Card>
        </Animated.View>

        {stats ? (
          <Animated.View entering={enterSection(1, reduced)} style={styles.stats}>
            <StatTile
              label={t('driver.statToday')}
              value={stats.deliveriesToday}
              icon="today-outline"
              tone="brand"
            />
            <StatTile
              label={t('driver.statWeek')}
              value={stats.completedThisWeek}
              icon="mc:home-heart"
              tone="safe"
            />
          </Animated.View>
        ) : null}

        {loading ? (
          <SkeletonList count={2} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void load()} compact />
        ) : (
          <>
            {newAssignment ? (
              <Animated.View entering={enterSection(2, reduced)}>
                <NewDeliveryCard
                  assignment={newAssignment}
                  accepting={accepting}
                  onAccept={() => void accept()}
                  onDecline={() => {
                    setReason('');
                    setReasonError(undefined);
                    setDeclineOpen(true);
                  }}
                />
              </Animated.View>
            ) : null}
            {active ? (
              <Animated.View entering={enterSection(3, reduced)}>
                <ActiveDeliveryCard
                  key={`${active.assignmentId}-${active.status}`}
                  assignment={active}
                  onConfirmPickup={confirmPickup}
                  onConfirmDropoff={confirmDropoff}
                />
              </Animated.View>
            ) : null}
            {!newAssignment && !active ? (
              <EmptyState
                compact
                illustration="deliverFood"
                title={t('driver.emptyTitle')}
                message={available ? t('driver.emptyOnBody') : t('driver.emptyOffBody')}
              />
            ) : null}
          </>
        )}
      </Animated.ScrollView>

      <BottomSheet
        visible={declineOpen}
        onClose={() => setDeclineOpen(false)}
        dismissible={!declining}
        title={t('driver.declineTitle')}
        subtitle={t('driver.declineBody')}
        footer={
          <View style={styles.sheetActions}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setDeclineOpen(false)}
              style={styles.flex}
            />
            <Button
              label={t('driver.declineConfirm')}
              variant="danger"
              onPress={() => void decline()}
              loading={declining}
              style={styles.flex}
            />
          </View>
        }
      >
        <ChipRow style={styles.reasons}>
          {REASONS.map((key) => (
            <Chip
              key={key}
              label={t(key)}
              tone="critical"
              selected={reason === t(key)}
              onPress={() => {
                setReason(t(key));
                setReasonError(undefined);
              }}
            />
          ))}
        </ChipRow>
        <TextField
          label={t('driver.reasonLabel')}
          value={reason}
          onChangeText={(v) => {
            setReason(v);
            setReasonError(undefined);
          }}
          error={reasonError}
          placeholder={t('driver.reasonPlaceholder')}
          multiline
          maxLength={500}
        />
      </BottomSheet>

      <BottomSheet visible={!!delivered} onClose={() => setDelivered(null)}>
        <View style={styles.success}>
          <Illustration name="success" width={200} />
          <AppText variant="title" align="center" accessibilityRole="header">
            {t('driver.deliveredTitle')}
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            {t('driver.deliveredBody', {
              what: deliveredWhat,
              org: delivered?.request.recipient.name ?? '',
            })}
          </AppText>
          <Button
            label={t('driver.done')}
            onPress={() => setDelivered(null)}
            style={styles.successBtn}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { paddingHorizontal: t.layout.screenPadding, paddingBottom: t.spacing.xxl },
  flex: { flex: 1 },
  availability: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  availabilityOn: { backgroundColor: t.colors.oliveSoft, borderColor: t.colors.olive },
  availIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', gap: t.spacing.sm + 2, marginBottom: t.spacing.md },
  reasons: { marginBottom: t.spacing.md },
  sheetActions: { flexDirection: 'row', gap: t.spacing.sm + 4 },
  success: { alignItems: 'center', gap: t.spacing.sm, paddingBottom: t.spacing.sm },
  successBtn: { alignSelf: 'stretch', marginTop: t.spacing.md },
}));
