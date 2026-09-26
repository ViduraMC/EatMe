import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  LargeTitle,
  Screen,
  SkeletonList,
  StatTile,
  TopBar,
  useScrollY,
} from '../../components';
import { fetchAssignments } from '../../api/driver.api';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { makeStyles, useTheme } from '../../theme';
import { enterListItem, enterSection, useReducedMotion } from '../../theme/animations';
import type { DriverAssignment } from '../../types/driver';
import type { DriverTabProps } from '../../navigation/types';
import { HistoryRow } from './components/HistoryRow';

type Filter = 'all' | 'completed' | 'declined' | 'cancelled';
const PAST: DriverAssignment['status'][] = ['completed', 'declined', 'cancelled'];

function isThisMonth(iso: string, now: number): boolean {
  const d = new Date(iso);
  const n = new Date(now);
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

/**
 * Past deliveries. Fetched once and filtered on the device, so switching
 * filters is instant and the totals at the top always match the list.
 */
export function DeliveryHistoryScreen(_props: DriverTabProps<'DriverHistory'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const now = useNow(60_000);
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [items, setItems] = useState<DriverAssignment[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const all = await fetchAssignments();
      setItems(
        all
          .filter((a) => PAST.includes(a.status))
          .sort(
            (a, b) =>
              new Date(b.completedAt ?? b.assignedAt).getTime() -
              new Date(a.completedAt ?? a.assignedAt).getTime(),
          ),
      );
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

  const summary = useMemo(() => {
    const completed = items.filter((a) => a.status === 'completed');
    return {
      completed: completed.length,
      month: completed.filter((a) => isThisMonth(a.completedAt ?? a.assignedAt, now))
        .length,
      declined: items.filter((a) => a.status === 'declined').length,
      cancelled: items.filter((a) => a.status === 'cancelled').length,
    };
  }, [items, now]);

  const visible = filter === 'all' ? items : items.filter((a) => a.status === filter);

  const header = (
    <View>
      <LargeTitle
        title={t('driver.historyTitle')}
        subtitle={t('driver.historySubtitle')}
        scrollY={scrollY}
      />
      {!loading && !error && items.length > 0 ? (
        <>
          <Animated.View entering={enterSection(0, reduced)} style={styles.stats}>
            <StatTile
              label={t('driver.statCompleted')}
              value={summary.completed}
              icon="mc:home-heart"
              tone="safe"
            />
            <StatTile
              label={t('driver.statMonth')}
              value={summary.month}
              icon="calendar-outline"
              tone="brand"
            />
          </Animated.View>
          <ChipRow style={styles.chips}>
            <Chip
              label={t('common.all')}
              count={items.length}
              selected={filter === 'all'}
              onPress={() => setFilter('all')}
            />
            <Chip
              label={t('driver.filterDelivered')}
              count={summary.completed}
              tone="safe"
              selected={filter === 'completed'}
              onPress={() => setFilter('completed')}
            />
            {summary.declined > 0 ? (
              <Chip
                label={t('driver.filterDeclined')}
                count={summary.declined}
                tone="critical"
                selected={filter === 'declined'}
                onPress={() => setFilter('declined')}
              />
            ) : null}
            {summary.cancelled > 0 ? (
              <Chip
                label={t('driver.filterCancelled')}
                count={summary.cancelled}
                tone="neutral"
                selected={filter === 'cancelled'}
                onPress={() => setFilter('cancelled')}
              />
            ) : null}
          </ChipRow>
        </>
      ) : null}
    </View>
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={4} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void load()} />;
  else if (items.length === 0)
    empty = (
      <EmptyState
        illustration="deliverFood"
        title={t('driver.historyEmptyTitle')}
        message={t('driver.historyEmptyBody')}
      />
    );
  else
    empty = (
      <EmptyState
        compact
        illustration="allClear"
        title={t('driver.historyFilterEmpty')}
      />
    );

  return (
    <Screen>
      <TopBar title={t('driver.historyTitle')} scrollY={scrollY} />
      <Animated.FlatList
        data={loading || error ? [] : visible}
        keyExtractor={(a) => String(a.assignmentId)}
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
            <HistoryRow assignment={item} now={now} />
          </Animated.View>
        )}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: {
    paddingHorizontal: t.layout.screenPadding,
    paddingBottom: t.spacing.xxl,
    flexGrow: 1,
  },
  stats: { flexDirection: 'row', gap: t.spacing.sm + 2, marginBottom: t.spacing.md },
  chips: { marginBottom: t.spacing.md },
}));
