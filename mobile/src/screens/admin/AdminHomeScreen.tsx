import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  BarChart,
  Button,
  Card,
  Divider,
  ErrorState,
  InfoBanner,
  LargeTitle,
  ListRow,
  ProgressBar,
  Screen,
  SectionHeader,
  SkeletonList,
  StatTile,
  TopBar,
  useScrollY,
  type BarGroup,
} from '../../components';
import {
  fetchAdminListings,
  fetchAdminRequests,
  fetchAdminStats,
  fetchAdminUsers,
} from '../../api/admin.api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterSection, useReducedMotion } from '../../theme/animations';
import type { AdminListing, AdminRequest, AdminStats } from '../../types/admin';
import type { ListingStatus } from '../../types/donation';
import { listingStatusTone } from '../../utils/listing';
import type { AdminTabProps } from '../../navigation/types';

const LISTING_ORDER: ListingStatus[] = [
  'open',
  'partially_claimed',
  'fully_claimed',
  'expired',
  'cancelled',
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Counts listings and requests created on each of the last seven days,
 * oldest first, ending today.
 *
 * The previous overview labelled its bars Monday to Sunday but filled them
 * with arbitrary combinations of all-time totals, so the chart looked real
 * without meaning anything. These counts come straight from createdAt.
 */
function lastSevenDays(listings: AdminListing[], requests: AdminRequest[], today: Date) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = startOfDay(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const bucket = (iso: string) => {
    const t = startOfDay(new Date(iso)).getTime();
    return days.findIndex((d) => d.getTime() === t);
  };
  const listingCounts = days.map(() => 0);
  const requestCounts = days.map(() => 0);
  for (const l of listings) {
    const i = bucket(l.createdAt);
    if (i >= 0) listingCounts[i] += 1;
  }
  for (const r of requests) {
    const i = bucket(r.createdAt);
    if (i >= 0) requestCounts[i] += 1;
  }
  return { days, listingCounts, requestCounts };
}

/**
 * The administrator's overview. It answers three questions in order:
 * how is the platform doing (four headline numbers, each a shortcut),
 * does anything need me (organisations waiting for approval), and what
 * has happened this week (a real seven-day chart).
 */
export function AdminHomeScreen({ navigation }: AdminTabProps<'AdminHome'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [s, l, r, u] = await Promise.all([
        fetchAdminStats(),
        fetchAdminListings(),
        fetchAdminRequests(),
        fetchAdminUsers(),
      ]);
      setStats(s);
      setListings(l);
      setRequests(r);
      setPendingCount(u.filter((x) => x.status === 'pending').length);
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

  const week = useMemo(
    () => lastSevenDays(listings, requests, new Date()),
    [listings, requests],
  );
  const weekdays = t('time.weekdaysShort').split('|');
  const groups: BarGroup[] = week.days.map((d, i) => ({
    label: i === 6 ? t('time.today') : (weekdays[d.getDay()] ?? ''),
    values: [week.listingCounts[i], week.requestCounts[i]],
    highlight: i === 6,
  }));
  const weekListings = week.listingCounts.reduce((a, b) => a + b, 0);
  const weekRequests = week.requestCounts.reduce((a, b) => a + b, 0);

  const mix = useMemo(() => {
    const counts = new Map<ListingStatus, number>();
    for (const l of listings) counts.set(l.status, (counts.get(l.status) ?? 0) + 1);
    return LISTING_ORDER.map((status) => ({ status, count: counts.get(status) ?? 0 }));
  }, [listings]);

  const pendingRequests = requests.filter((r) => r.status === 'pending').length;

  let body: React.ReactNode;
  if (loading) body = <SkeletonList count={3} />;
  else if (error || !stats)
    body = <ErrorState error={error} onRetry={() => void load()} />;
  else
    body = (
      <>
        <Animated.View entering={enterSection(0, reduced)} style={styles.grid}>
          <View style={styles.gridRow}>
            <StatTile
              label={t('admin.kpiUsers')}
              value={stats.users.active}
              caption={t('admin.ofTotal', { total: stats.users.total })}
              icon="people-outline"
              tone="info"
              onPress={() => navigation.navigate('AdminUsers')}
            />
            <StatTile
              label={t('admin.kpiListings')}
              value={stats.listings.open}
              caption={t('admin.ofTotal', { total: stats.listings.total })}
              icon="mc:basket-outline"
              tone="brand"
              onPress={() => navigation.navigate('AdminListings')}
            />
          </View>
          <View style={styles.gridRow}>
            <StatTile
              label={t('admin.kpiRequests')}
              value={stats.requests.pending}
              caption={t('admin.ofTotal', { total: stats.requests.total })}
              icon="hand-left-outline"
              tone="urgent"
              onPress={() => navigation.navigate('AdminRequests')}
            />
            <StatTile
              label={t('admin.kpiDeliveries')}
              value={stats.assignments.completed}
              caption={t('admin.ofTotal', { total: stats.assignments.total })}
              icon="mc:home-heart"
              tone="safe"
              onPress={() => navigation.navigate('AdminAssignments')}
            />
          </View>
        </Animated.View>

        <Animated.View entering={enterSection(1, reduced)}>
          <SectionHeader title={t('admin.attention')} />
          {pendingCount > 0 ? (
            <InfoBanner
              tone="urgent"
              icon="shield-checkmark-outline"
              title={t('admin.pendingApprovals', { count: pendingCount })}
              message={t('admin.pendingApprovalsBody')}
              action={
                <Button
                  label={t('admin.review')}
                  size="sm"
                  inline
                  iconRight="arrow-forward"
                  onPress={() => navigation.navigate('AdminUsers', { filter: 'pending' })}
                />
              }
            />
          ) : (
            <InfoBanner tone="safe" message={t('admin.allCaughtUp')} />
          )}
          {pendingRequests > 0 ? (
            <ListRow
              style={styles.attentionRow}
              icon="hourglass-outline"
              iconTone="urgent"
              title={t('admin.openRequests')}
              value={f.number(pendingRequests)}
              chevron
              onPress={() => navigation.navigate('AdminRequests')}
            />
          ) : null}
        </Animated.View>

        <Animated.View entering={enterSection(2, reduced)}>
          <SectionHeader title={t('admin.last7Days')} />
          <Card>
            <AppText variant="secondary" color="textSecondary" style={styles.hint}>
              {t('admin.last7DaysHint')}
            </AppText>
            <BarChart
              series={[
                { label: t('admin.legendListings'), tone: 'brand' },
                { label: t('admin.legendRequests'), tone: 'olive' },
              ]}
              groups={groups}
              accessibilityLabel={t('admin.chartSummary', {
                listings: weekListings,
                requests: weekRequests,
              })}
            />
          </Card>
        </Animated.View>

        {listings.length > 0 ? (
          <Animated.View entering={enterSection(3, reduced)}>
            <SectionHeader title={t('admin.listingMix')} meta={String(listings.length)} />
            <Card>
              {mix.map(({ status, count }, i) => (
                <View key={status} style={i > 0 ? styles.mixRowGap : undefined}>
                  <View style={styles.mixLabel}>
                    <AppText variant="secondary">{f.status('listing', status)}</AppText>
                    <AppText variant="secondaryStrong">{f.number(count)}</AppText>
                  </View>
                  <ProgressBar
                    value={count / listings.length}
                    tone={listingStatusTone[status]}
                    height={6}
                    accessibilityLabel={`${f.status('listing', status)}, ${count}`}
                  />
                </View>
              ))}
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={enterSection(4, reduced)}>
          <SectionHeader title={t('admin.browse')} />
          <Card style={styles.listCard}>
            <ListRow
              icon="mc:basket-outline"
              iconTone="brand"
              title={t('admin.openListings')}
              value={f.number(stats.listings.total)}
              chevron
              onPress={() => navigation.navigate('AdminListings')}
            />
            <Divider inset={48} />
            <ListRow
              icon="hand-left-outline"
              iconTone="olive"
              title={t('admin.openRequests')}
              value={f.number(stats.requests.total)}
              chevron
              onPress={() => navigation.navigate('AdminRequests')}
            />
            <Divider inset={48} />
            <ListRow
              icon="mc:truck-outline"
              iconTone="info"
              title={t('admin.openDeliveries')}
              value={f.number(stats.assignments.total)}
              chevron
              onPress={() => navigation.navigate('AdminAssignments')}
            />
          </Card>
        </Animated.View>
      </>
    );

  return (
    <Screen>
      <TopBar title={t('admin.overviewTitle')} scrollY={scrollY} />
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
          title={t('admin.overviewTitle')}
          scrollY={scrollY}
        />
        {body}
      </Animated.ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xxl,
    flexGrow: 1,
  },
  grid: { gap: t.spacing.sm + 2 },
  gridRow: { flexDirection: 'row', gap: t.spacing.sm + 2 },
  attentionRow: {
    marginTop: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  listCard: { paddingVertical: t.spacing.xs },
  hint: { marginBottom: t.spacing.md },
  mixRowGap: { marginTop: t.spacing.sm + 4 },
  mixLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: t.spacing.xs + 2,
  },
}));
