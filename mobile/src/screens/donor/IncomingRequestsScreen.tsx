import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  Icon,
  InfoBanner,
  LargeTitle,
  Screen,
  SkeletonList,
  TopBar,
  useScrollY,
} from '../../components';
import { fetchIncomingRequests } from '../../api/donations.api';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { requestTone } from '../../utils/status';
import { enterListItem, enterSection, useReducedMotion } from '../../theme/animations';
import type { IncomingRequest, RequestStatus } from '../../types/assignment';
import type { DonorTabProps } from '../../navigation/types';

type Filter = 'all' | RequestStatus;

const FILTERS: Filter[] = ['all', 'pending', 'accepted', 'rejected', 'cancelled'];

/**
 * Who has asked for this donor's food. Read only.
 *
 * Sprint 2 moved approval to the Donation Coordinator. A screen with no
 * buttons reads as broken unless it says why, so the first thing on it is a
 * plain explanation that there is nothing the donor needs to do here.
 */
export function IncomingRequestsScreen(_props: DonorTabProps<'IncomingRequests'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const now = useNow(60_000);
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // All statuses are fetched once and filtered here, so every chip can show
  // its count and switching filters is instant.
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setRequests(await fetchIncomingRequests());
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
        title={t('donor.requestsTitle')}
        subtitle={t('donor.requestsSubtitle')}
        scrollY={scrollY}
      />
      <Animated.View entering={enterSection(0, reduced)}>
        <InfoBanner
          tone="info"
          icon="people-circle-outline"
          message={t('donor.coordinatorNote')}
        />
      </Animated.View>
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
        title={t('donor.requestsEmptyTitle')}
        message={t('donor.requestsEmptyBody')}
      />
    );
  else
    empty = (
      <EmptyState
        compact
        illustration="allClear"
        title={t('donor.requestsFilterEmpty')}
      />
    );

  return (
    <Screen>
      <TopBar title={t('donor.requestsTitle')} scrollY={scrollY} />
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
          <Animated.View entering={enterListItem(index, reduced)}>
            <RequestCard request={item} now={now} />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

function RequestCard({ request, now }: { request: IncomingRequest; now: number }) {
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const who = request.recipient.organisationName ?? request.recipient.name;

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
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {t('donor.forListing', { title: request.listing.title })}
          </AppText>
        </View>
        <Badge
          label={f.status('request', request.status)}
          tone={requestTone[request.status]}
          size="sm"
        />
      </View>

      <View style={styles.items}>
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
      </View>

      {request.message ? (
        <View style={styles.quote}>
          <Icon name="chatbubble-ellipses-outline" size={16} color="textSecondary" />
          <AppText
            variant="secondary"
            color="textSecondary"
            style={[styles.flex, styles.italic]}
          >
            {request.message}
          </AppText>
        </View>
      ) : null}

      {request.status === 'rejected' && request.rejectionReason ? (
        <AppText variant="caption" color="criticalText" style={styles.reason}>
          {t('donor.reason', { reason: request.rejectionReason })}
        </AppText>
      ) : null}

      <AppText variant="caption" color="textTertiary" style={styles.when}>
        {t('donor.received', { when: f.relative(request.createdAt, now) })}
      </AppText>
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
  head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm + 4 },
  items: {
    marginTop: t.spacing.sm + 4,
    padding: t.spacing.sm + 4,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
    gap: t.spacing.xs + 2,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  quote: { flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.sm + 4 },
  italic: { fontStyle: 'italic' },
  reason: { marginTop: t.spacing.sm },
  when: { marginTop: t.spacing.sm + 4 },
}));
