import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  Icon,
  LargeTitle,
  Screen,
  SkeletonList,
  Timeline,
  TopBar,
  useConfirm,
  useScrollY,
  useToast,
  type TimelineStep,
} from '../../components';
import { cancelRequest, fetchMyRequests } from '../../api/requests.api';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { describeError } from '../../i18n/errors';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import {
  enterListItem,
  layoutTransition,
  useReducedMotion,
} from '../../theme/animations';
import type { DonationRequest, RequestStatus } from '../../types/request';
import { requestTone } from '../../utils/status';
import type { RecipientTabProps } from '../../navigation/types';

type Filter = 'all' | RequestStatus;
const FILTERS: Filter[] = ['all', 'pending', 'accepted', 'rejected', 'cancelled'];

/**
 * Everything this recipient has asked for, and where each request is.
 *
 * Each card shows a three-step journey (sent, coordinator review, delivery)
 * so "what happens now?" is answered without asking anyone. A pending
 * request can be withdrawn; that is a quiet text button behind a
 * confirmation, since it gives the food back to other recipients.
 */
export function MyRequestsScreen({ navigation }: RecipientTabProps<'MyRequests'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const toast = useToast();
  const confirm = useConfirm();
  const now = useNow(60_000);
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setRequests(await fetchMyRequests());
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

  async function onCancel(request: DonationRequest) {
    const ok = await confirm({
      title: t('recipient.cancelTitle'),
      message: t('recipient.cancelBody'),
      confirmLabel: t('recipient.cancelRequest'),
      cancelLabel: t('recipient.keepRequest'),
      tone: 'critical',
    });
    if (!ok) return;
    setCancellingId(request.requestId);
    try {
      const updated = await cancelRequest(request.requestId);
      setRequests((current) =>
        current.map((r) =>
          r.requestId === updated.requestId ? { ...r, status: updated.status } : r,
        ),
      );
      toast.show({ type: 'success', title: t('recipient.cancelledToast') });
    } catch (err) {
      toast.show({ type: 'error', title: describeError(err, t).message });
    } finally {
      setCancellingId(null);
    }
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: requests.length,
      pending: 0,
      accepted: 0,
      rejected: 0,
      cancelled: 0,
    };
    requests.forEach((r) => {
      c[r.status] += 1;
    });
    return c;
  }, [requests]);

  const visible =
    filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  const header = (
    <View>
      <LargeTitle
        title={t('recipient.myRequestsTitle')}
        subtitle={t('recipient.myRequestsSubtitle')}
        scrollY={scrollY}
      />
      {!loading && !error && requests.length > 0 ? (
        <ChipRow style={styles.chips}>
          {FILTERS.filter((key) => key === 'all' || counts[key] > 0).map((key) => (
            <Chip
              key={key}
              label={key === 'all' ? t('common.all') : f.status('request', key)}
              count={counts[key]}
              tone={key === 'all' ? 'brand' : requestTone[key]}
              selected={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
        </ChipRow>
      ) : null}
    </View>
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={3} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void load()} />;
  else if (requests.length === 0)
    empty = (
      <EmptyState
        illustration="requestFood"
        title={t('recipient.myEmptyTitle')}
        message={t('recipient.myEmptyBody')}
        actionLabel={t('recipient.browseFood')}
        onAction={() => navigation.navigate('BrowseListings')}
      />
    );
  else
    empty = (
      <EmptyState compact illustration="allClear" title={t('recipient.myFilterEmpty')} />
    );

  return (
    <Screen>
      <TopBar title={t('recipient.myRequestsTitle')} scrollY={scrollY} />
      <Animated.FlatList
        data={loading || error ? [] : visible}
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
            <RequestCard
              request={item}
              now={now}
              cancelling={cancellingId === item.requestId}
              onCancel={() => void onCancel(item)}
            />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

function RequestCard({
  request,
  now,
  cancelling,
  onCancel,
}: {
  request: DonationRequest;
  now: number;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const donor = request.listing.donor.organisationName ?? request.listing.donor.name;

  const review: TimelineStep =
    request.status === 'pending'
      ? {
          key: 'review',
          title: t('recipient.stepReview'),
          state: 'current',
          icon: 'hourglass-outline',
        }
      : request.status === 'accepted'
        ? { key: 'review', title: t('recipient.stepApproved'), state: 'done' }
        : request.status === 'rejected'
          ? { key: 'review', title: t('recipient.stepRejected'), state: 'failed' }
          : { key: 'review', title: t('recipient.stepCancelled'), state: 'failed' };

  const steps: TimelineStep[] = [
    {
      key: 'sent',
      title: t('recipient.stepSent'),
      subtitle: f.relative(request.createdAt, now),
      state: 'done',
    },
    review,
    {
      key: 'delivery',
      title: t('recipient.stepDelivery'),
      state: request.status === 'accepted' ? 'current' : 'upcoming',
      icon: 'mc:truck-delivery-outline',
    },
  ];

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {request.listing.title}
          </AppText>
          <View style={styles.donorRow}>
            <Avatar name={donor} size={20} />
            <AppText
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={styles.flex}
            >
              {donor}
            </AppText>
          </View>
        </View>
        <Badge
          label={f.status('request', request.status)}
          tone={requestTone[request.status]}
          dot={request.status === 'pending'}
          size="sm"
        />
      </View>

      <View style={styles.items}>
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

      <Timeline steps={steps} style={styles.timeline} />

      {request.status === 'rejected' && request.rejectionReason ? (
        <AppText variant="caption" color="criticalText">
          {t('donor.reason', { reason: request.rejectionReason })}
        </AppText>
      ) : null}

      {request.status === 'pending' ? (
        <Button
          label={t('recipient.cancelRequest')}
          variant="dangerGhost"
          size="sm"
          inline
          icon="close-circle-outline"
          onPress={onCancel}
          loading={cancelling}
          style={styles.cancel}
        />
      ) : null}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xxl,
    flexGrow: 1,
  },
  chips: { marginBottom: t.spacing.md },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs + 2,
    marginTop: 4,
  },
  items: {
    marginTop: t.spacing.sm + 4,
    padding: t.spacing.sm + 4,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
    gap: t.spacing.xs + 2,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  timeline: { marginTop: t.spacing.md },
  cancel: { alignSelf: 'flex-end', marginTop: t.spacing.xs },
}));
