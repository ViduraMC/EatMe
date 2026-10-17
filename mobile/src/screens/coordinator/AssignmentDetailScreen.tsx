import React, { useCallback, useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  ErrorState,
  Icon,
  IconButton,
  InfoBanner,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonCard,
  TextField,
  Timeline,
  useToast,
} from '../../components';
import {
  fetchAssignmentDetail,
  fetchDrivers,
  reassignDriver,
} from '../../api/assignments.api';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterSection, useReducedMotion } from '../../theme/animations';
import type { AssignmentDetail, DriverInfo } from '../../types/assignment';
import { assignmentSteps } from '../../utils/assignmentTimeline';
import { assignmentTone } from '../../utils/status';
import type { CoordinatorStackProps } from '../../navigation/types';
import { DriverPicker } from './components/DriverPicker';

function call(phone: string) {
  void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
}

/**
 * One delivery in full: the route (collect from, deliver to), who is
 * driving, what they carry, and every step with its time.
 *
 * Each person on it has a call button, because when something goes wrong
 * the fix is usually a phone call, and a coordinator should not have to hunt
 * for the number. A declined delivery leads with the reason and a Reassign
 * button, which offers every driver except the one who declined.
 */
export function AssignmentDetailScreen({
  navigation,
  route,
}: CoordinatorStackProps<'AssignmentDetail'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const now = useNow(60_000);
  const reduced = useReducedMotion();
  const { assignmentId } = route.params;

  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        setDetail(await fetchAssignmentDetail(assignmentId));
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setRefreshing(false);
      }
    },
    [assignmentId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function openReassign() {
    setSelectedId(null);
    setNote(detail?.noteToDriver ?? '');
    setSheet(true);
    try {
      setDrivers(await fetchDrivers());
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    }
  }

  async function confirmReassign() {
    if (!detail || !selectedId) return;
    const driver = drivers.find((d) => d.userId === selectedId);
    setSubmitting(true);
    try {
      const next = await reassignDriver(detail.assignmentId, {
        requestId: detail.requestId,
        driverId: selectedId,
        noteToDriver: note.trim() || null,
      });
      setSheet(false);
      toast.show({
        type: 'success',
        title: t('coordinator.reassignedToast', { name: driver?.name ?? '' }),
      });
      navigation.replace('AssignmentDetail', { assignmentId: next.assignmentId });
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !detail) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState error={error} onRetry={() => void load()} />
      </Screen>
    );
  }
  if (!detail) {
    return (
      <Screen edges={['left', 'right']}>
        <View style={styles.content}>
          <Skeleton width="60%" height={26} />
          <Skeleton width="35%" height={16} style={styles.skGap} />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  const { request, driver } = detail;
  const donor = request.listing.donor;
  const donorName = donor.organisationName ?? donor.name;
  const recipientName = request.recipient.organisationName ?? request.recipient.name;
  const declined = detail.status === 'declined';
  const history = detail.relatedAssignments.filter(
    (a) => a.assignmentId !== detail.assignmentId,
  );

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
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
        <Animated.View entering={enterSection(0, reduced)}>
          <View style={styles.titleRow}>
            <AppText variant="caption" color="textSecondary">
              {t('donor.deliveryNo', { id: detail.assignmentId })}
            </AppText>
            <Badge
              label={f.status('assignment', detail.status)}
              tone={assignmentTone[detail.status]}
              dot
            />
          </View>
          <AppText variant="title" accessibilityRole="header" style={styles.title}>
            {request.listing.title}
          </AppText>

          {declined ? (
            <InfoBanner
              tone="critical"
              title={t('coordinator.declinedBy', { name: driver.name })}
              message={
                detail.declineReason
                  ? t('coordinator.declineReason', { reason: detail.declineReason })
                  : ''
              }
              action={
                <Button
                  label={t('coordinator.reassign')}
                  icon="refresh"
                  size="sm"
                  inline
                  onPress={() => void openReassign()}
                />
              }
            />
          ) : null}
        </Animated.View>

        <Animated.View entering={enterSection(1, reduced)}>
          <SectionHeader title={t('coordinator.route')} />
          <Card variant="flat">
            <Stop
              icon="mc:basket-outline"
              label={t('coordinator.pickupFrom')}
              name={donorName}
              detail={`${request.listing.pickupAddress}\n${f.window(request.listing.pickupWindowStart, request.listing.pickupWindowEnd)}`}
              phone={donor.phone}
            />
            <View style={styles.connector}>
              <View style={styles.dash} />
              <Icon name="arrow-down" size={16} color="textTertiary" />
              <View style={styles.dash} />
            </View>
            <Stop
              icon="mc:home-heart"
              label={t('coordinator.deliverTo')}
              name={recipientName}
              detail={
                request.recipient.name !== recipientName
                  ? request.recipient.name
                  : undefined
              }
              phone={request.recipient.phone}
            />
          </Card>

          <Card variant="flat" style={styles.driver}>
            <Avatar name={driver.name} size={44} icon="mc:truck-delivery-outline" />
            <View style={styles.flex}>
              <AppText variant="caption" color="textSecondary">
                {t('donor.driver')}
              </AppText>
              <AppText variant="bodyStrong">{driver.name}</AppText>
              <Badge
                size="sm"
                label={
                  driver.isAvailable ? t('settings.available') : t('settings.unavailable')
                }
                tone={driver.isAvailable ? 'safe' : 'neutral'}
                dot
                style={styles.driverBadge}
              />
            </View>
            <IconButton
              icon="call"
              variant="filled"
              tone="olive"
              onPress={() => call(driver.phone)}
              accessibilityLabel={t('coordinator.callName', { name: driver.name })}
            />
          </Card>

          {detail.noteToDriver ? (
            <InfoBanner
              tone="neutral"
              icon="chatbox-ellipses-outline"
              title={t('coordinator.noteLabel')}
              message={detail.noteToDriver}
            />
          ) : null}
        </Animated.View>

        <SectionHeader
          title={t('coordinator.needs')}
          meta={String(request.items.length)}
        />
        <Card variant="flat" style={styles.items}>
          {request.items.map((line) => (
            <View key={line.requestItemId} style={styles.line}>
              <Icon name="ellipse" size={6} color="brand" />
              <AppText variant="secondary" style={styles.flex} numberOfLines={1}>
                {line.item.foodName}
              </AppText>
              <AppText variant="secondaryStrong">
                {f.quantity(line.quantityRequested, line.item.unit)}
              </AppText>
            </View>
          ))}
        </Card>

        <SectionHeader title={t('coordinator.progress')} />
        <Timeline steps={assignmentSteps(detail, t, f)} />

        {history.length > 0 ? (
          <>
            <SectionHeader
              title={t('coordinator.history')}
              meta={String(history.length)}
            />
            <AppText variant="caption" color="textSecondary" style={styles.historyHint}>
              {t('coordinator.historyHint')}
            </AppText>
            {history.map((h) => (
              <Card key={h.assignmentId} variant="flat" style={styles.historyRow}>
                <Avatar name={h.driver.name} size={36} />
                <View style={styles.flex}>
                  <AppText variant="secondaryStrong">{h.driver.name}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {t('coordinator.assignedWhen', {
                      when: f.relative(h.assignedAt, now),
                    })}
                  </AppText>
                  {h.declineReason ? (
                    <AppText variant="caption" color="criticalText">
                      {t('coordinator.declineReason', { reason: h.declineReason })}
                    </AppText>
                  ) : null}
                </View>
                <Badge
                  size="sm"
                  label={f.status('assignment', h.status)}
                  tone={assignmentTone[h.status]}
                />
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        dismissible={!submitting}
        title={t('coordinator.reassignTitle')}
        scrollable
        footer={
          <Button
            label={t('coordinator.reassignConfirm')}
            icon="refresh"
            onPress={() => void confirmReassign()}
            loading={submitting}
            disabled={!selectedId}
          />
        }
      >
        <DriverPicker
          drivers={drivers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          excludeId={driver.userId}
        />
        <TextField
          label={t('coordinator.noteLabel')}
          optional
          value={note}
          onChangeText={setNote}
          placeholder={t('coordinator.notePlaceholder')}
          multiline
          maxLength={1000}
          containerStyle={styles.note}
        />
      </BottomSheet>
    </Screen>
  );
}

function Stop({
  icon,
  label,
  name,
  detail,
  phone,
}: {
  icon: 'mc:basket-outline' | 'mc:home-heart';
  label: string;
  name: string;
  detail?: string;
  phone: string;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  return (
    <View style={styles.stop}>
      <View style={styles.stopIcon}>
        <Icon name={icon} size={20} color="brandText" />
      </View>
      <View style={styles.flex}>
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
        <AppText variant="bodyStrong">{name}</AppText>
        {detail ? (
          <AppText variant="caption" color="textSecondary">
            {detail}
          </AppText>
        ) : null}
      </View>
      <IconButton
        icon="call-outline"
        variant="tonal"
        tone="brand"
        size="sm"
        onPress={() => call(phone)}
        accessibilityLabel={t('coordinator.callName', { name })}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.layout.screenPadding, paddingBottom: t.spacing.xxl },
  flex: { flex: 1 },
  skGap: { marginTop: t.spacing.sm, marginBottom: t.spacing.lg },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { marginTop: t.spacing.xs, marginBottom: t.spacing.md },
  stop: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm + 4 },
  stopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: { alignItems: 'center', width: 40, paddingVertical: t.spacing.xs, gap: 2 },
  dash: { width: 2, height: 8, borderRadius: 1, backgroundColor: t.colors.border },
  driver: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  driverBadge: { marginTop: 4 },
  items: { gap: t.spacing.xs + 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  historyHint: { marginTop: -t.spacing.sm, marginBottom: t.spacing.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    marginBottom: t.spacing.sm,
  },
  note: { marginTop: t.spacing.md },
}));
