import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  Icon,
  LargeTitle,
  Screen,
  SectionHeader,
  SkeletonList,
  StatTile,
  TextField,
  TopBar,
  UrgencyBadge,
  useScrollY,
  useToast,
} from '../../components';
import {
  fetchAssignmentQueue,
  fetchCoordinatorStats,
  rejectRequest,
} from '../../api/assignments.api';
import { useAuth } from '../../context/AuthContext';
import { useNow } from '../../hooks/useNow';
import { useI18n, type TKey } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import {
  enterListItem,
  enterSection,
  layoutTransition,
  useReducedMotion,
} from '../../theme/animations';
import type { AssignmentQueueRequest, CoordinatorStats } from '../../types/assignment';
import type { UrgencyLevel } from '../../types/donation';
import { worstUrgency } from '../../utils/freshness';
import { haptics } from '../../utils/haptics';
import type { CoordinatorTabProps } from '../../navigation/types';

const URGENCY_RANK: Record<UrgencyLevel, number> = { critical: 0, urgent: 1, safe: 2 };
const REASONS: TKey[] = [
  'coordinator.reasonExpired',
  'coordinator.reasonDistance',
  'coordinator.reasonDuplicate',
  'coordinator.reasonNoDrivers',
];

function soonestExpiry(r: AssignmentQueueRequest): string | null {
  const dates = r.items
    .map((i) => i.item.effectiveExpiry)
    .filter((d): d is string => !!d);
  return dates.sort()[0] ?? null;
}

/**
 * The coordinator's home: the requests waiting to be matched with a driver.
 *
 * Sorted by the most urgent food in each request, then by how long it has
 * waited, because a coordinator's first question is "what will spoil first?".
 * The four numbers at the top double as shortcuts into Deliveries, already
 * filtered to that status.
 *
 * Declining asks for a reason in a sheet with one-tap common reasons. (The
 * previous version used Alert.prompt, which only exists on iOS, so declining
 * with a reason did not work on Android at all.)
 */
export function CoordinatorHomeScreen({
  navigation,
}: CoordinatorTabProps<'CoordinatorHome'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const { user } = useAuth();
  const now = useNow();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [stats, setStats] = useState<CoordinatorStats | null>(null);
  const [queue, setQueue] = useState<AssignmentQueueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [declining, setDeclining] = useState<AssignmentQueueRequest | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [s, q] = await Promise.all([fetchCoordinatorStats(), fetchAssignmentQueue()]);
      setStats(s);
      setQueue(q);
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

  const sorted = useMemo(
    () =>
      [...queue].sort((a, b) => {
        const ua = URGENCY_RANK[worstUrgency(a.items.map((i) => i.item.urgencyLevel))];
        const ub = URGENCY_RANK[worstUrgency(b.items.map((i) => i.item.urgencyLevel))];
        return ua !== ub
          ? ua - ub
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [queue],
  );

  async function confirmDecline() {
    if (!declining) return;
    setSubmitting(true);
    try {
      await rejectRequest(declining.requestId, {
        rejectionReason: reason.trim() || null,
      });
      setQueue((q) => q.filter((r) => r.requestId !== declining.requestId));
      toast.show({ type: 'success', title: t('coordinator.declinedToast') });
      setDeclining(null);
      void load();
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <View>
      <LargeTitle
        eyebrow={t('donor.greetingName', {
          greeting: f.greeting(),
          name: user?.name.split(' ')[0] ?? '',
        })}
        title={t('coordinator.queueTitle')}
        scrollY={scrollY}
      />
      {stats ? (
        <Animated.View entering={enterSection(0, reduced)} style={styles.grid}>
          <View style={styles.gridRow}>
            <StatTile
              label={t('coordinator.statWaiting')}
              value={stats.queueSize}
              icon="mc:inbox-arrow-down-outline"
              tone="brand"
            />
            <StatTile
              label={t('coordinator.statPendingDriver')}
              value={stats.pendingDriverCount}
              icon="hourglass-outline"
              tone="urgent"
              onPress={() =>
                navigation.navigate('AssignmentsList', { status: 'pending_driver' })
              }
            />
          </View>
          <View style={styles.gridRow}>
            <StatTile
              label={t('coordinator.statActive')}
              value={stats.activeDeliveryCount}
              icon="mc:truck-fast-outline"
              tone="info"
              onPress={() =>
                navigation.navigate('AssignmentsList', { status: 'in_transit' })
              }
            />
            <StatTile
              label={t('coordinator.statDone')}
              value={stats.completedDeliveryCount}
              icon="mc:home-heart"
              tone="safe"
              onPress={() =>
                navigation.navigate('AssignmentsList', { status: 'completed' })
              }
            />
          </View>
        </Animated.View>
      ) : null}
      {!loading && !error && queue.length > 0 ? (
        <SectionHeader
          title={t('coordinator.queueSection')}
          meta={String(queue.length)}
        />
      ) : null}
    </View>
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={3} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void load()} />;
  else
    empty = (
      <EmptyState
        compact
        illustration="allClear"
        title={t('coordinator.queueEmptyTitle')}
        message={t('coordinator.queueEmptyBody')}
      />
    );

  const declineOrg = declining
    ? (declining.recipient.organisationName ?? declining.recipient.name)
    : '';

  return (
    <Screen>
      <TopBar title={t('coordinator.queueTitle')} scrollY={scrollY} />
      <Animated.FlatList
        data={loading || error ? [] : sorted}
        keyExtractor={(r) => String(r.requestId)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
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
        renderItem={({ item, index }) => (
          <Animated.View
            entering={enterListItem(index, reduced)}
            layout={layoutTransition(reduced)}
          >
            <QueueCard
              request={item}
              now={now}
              onAssign={() =>
                navigation.navigate('CreateAssignment', { requestId: item.requestId })
              }
              onDecline={() => {
                haptics.warning();
                setReason('');
                setDeclining(item);
              }}
            />
          </Animated.View>
        )}
      />

      <BottomSheet
        visible={!!declining}
        onClose={() => setDeclining(null)}
        dismissible={!submitting}
        title={t('coordinator.declineTitle')}
        subtitle={t('coordinator.declineBody', { org: declineOrg })}
        footer={
          <View style={styles.sheetActions}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={() => setDeclining(null)}
              style={styles.flex}
            />
            <Button
              label={t('coordinator.declineConfirm')}
              variant="danger"
              onPress={() => void confirmDecline()}
              loading={submitting}
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
              onPress={() => setReason(t(key))}
            />
          ))}
        </ChipRow>
        <TextField
          label={t('coordinator.reasonLabel')}
          optional
          value={reason}
          onChangeText={setReason}
          placeholder={t('coordinator.reasonPlaceholder')}
          multiline
          maxLength={1000}
        />
      </BottomSheet>
    </Screen>
  );
}

function QueueCard({
  request,
  now,
  onAssign,
  onDecline,
}: {
  request: AssignmentQueueRequest;
  now: number;
  onAssign: () => void;
  onDecline: () => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const who = request.recipient.organisationName ?? request.recipient.name;
  const level = worstUrgency(request.items.map((i) => i.item.urgencyLevel));
  const expiry = soonestExpiry(request);

  return (
    <Card>
      <View style={styles.head}>
        <Avatar
          name={who}
          size={44}
          icon={request.recipient.organisationName ? 'mc:home-heart' : undefined}
        />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {who}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {t('coordinator.requestedWhen', { when: f.relative(request.createdAt, now) })}
          </AppText>
        </View>
        <Badge
          size="sm"
          label={
            request.status === 'pending'
              ? t('coordinator.newRequest')
              : t('coordinator.approvedNeedsDriver')
          }
          tone={request.status === 'pending' ? 'brand' : 'info'}
          dot
        />
      </View>

      <View style={styles.needs}>
        <AppText variant="overline" color="textSecondary">
          {t('coordinator.needs')}
        </AppText>
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
        <View style={styles.fromRow}>
          <Icon name="mc:basket-outline" size={14} color="textSecondary" />
          <AppText
            variant="caption"
            color="textSecondary"
            numberOfLines={1}
            style={styles.flex}
          >
            {`${t('coordinator.fromListing', { title: request.listing.title })} · ${f.dayTime(request.listing.pickupWindowStart)}`}
          </AppText>
        </View>
      </View>

      {request.message ? (
        <View style={styles.quote}>
          <Icon name="chatbubble-ellipses-outline" size={15} color="textSecondary" />
          <AppText
            variant="secondary"
            color="textSecondary"
            style={[styles.flex, styles.italic]}
          >
            {request.message}
          </AppText>
        </View>
      ) : null}

      {expiry ? (
        <UrgencyBadge
          level={level}
          timeLeft={f.timeLeft(expiry, now)}
          size="sm"
          style={styles.urgency}
        />
      ) : null}

      {/* Buttons get their own full-width row, so the long "Assign driver"
          label (and its Sinhala translation) never runs past the card. */}
      <View style={styles.actions}>
        <Button
          label={t('coordinator.decline')}
          variant="secondary"
          size="sm"
          onPress={onDecline}
          accessibilityHint={who}
          style={styles.flex}
        />
        <Button
          label={t('coordinator.assignDriver')}
          size="sm"
          icon="mc:truck-plus-outline"
          onPress={onAssign}
          style={styles.assign}
        />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xxl,
    flexGrow: 1,
  },
  flex: { flex: 1 },
  grid: { gap: t.spacing.sm + 2, marginBottom: t.spacing.xs },
  gridRow: { flexDirection: 'row', gap: t.spacing.sm + 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  needs: {
    marginTop: t.spacing.sm + 4,
    padding: t.spacing.sm + 4,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
    gap: t.spacing.xs + 2,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs + 2,
    marginTop: t.spacing.xs,
  },
  quote: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.sm + 4 },
  italic: { fontStyle: 'italic' },
  urgency: { alignSelf: 'flex-start', marginTop: t.spacing.sm + 4 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: t.spacing.md,
    gap: t.spacing.sm + 2,
  },
  assign: { flex: 1.6 },
  reasons: { marginBottom: t.spacing.md },
  sheetActions: { flexDirection: 'row', gap: t.spacing.sm + 4 },
}));
