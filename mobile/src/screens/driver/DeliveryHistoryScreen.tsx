import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { EmptyState } from '../../components';
import { getErrorMessage } from '../../api/client';
import { fetchAssignments } from '../../api/driver.api';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { isThisMonth } from '../../utils/datetime';
import { FilterChips, type FilterOption } from './components/FilterChips';
import { HistoryRow } from './components/HistoryRow';
import { StatCard, StatRow } from './components/StatCard';
import type { AssignmentStatus, DriverAssignment } from '../../types';

/**
 * Delivery history. Figma frame "03 Driver History".
 *
 * The whole list is fetched once and filtered on the device rather than
 * refetching per chip: three statuses over one driver's assignments is a small
 * enough set that a round trip per tap is not worth it.
 */

type Filter = 'all' | 'completed' | 'declined';

const FILTERS: readonly FilterOption<Filter>[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
];

/** Statuses that count as history. An assignment still in play is not one. */
const PAST: readonly AssignmentStatus[] = ['completed', 'declined', 'cancelled'];

export function DeliveryHistoryScreen() {
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const all = await fetchAssignments();
      setAssignments(all.filter((item) => PAST.includes(item.status)));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void load();
  }, [load]);

  /*
   * TODO: GET /driver/stats only returns deliveriesToday and completedThisWeek,
   * so these two are counted here. Move them to the endpoint once the list is
   * paginated, because at that point the device will not have every row.
   */
  const summary = useMemo(() => {
    const completed = assignments.filter((item) => item.status === 'completed');
    return {
      total: completed.length,
      thisMonth: completed.filter((item) =>
        isThisMonth(item.completedAt ?? item.assignedAt),
      ).length,
    };
  }, [assignments]);

  const visible = useMemo(() => {
    if (filter === 'all') {
      return assignments;
    }
    return assignments.filter((item) => item.status === filter);
  }, [assignments, filter]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centre} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={colours.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.assignmentId)}
        renderItem={({ item }) => <HistoryRow assignment={item} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colours.accent}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Delivery History</Text>

            <StatRow>
              <StatCard value={summary.total} label="Total deliveries" />
              <StatCard value={summary.thisMonth} label="This month" />
            </StatRow>

            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />

            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing here yet"
            message={
              filter === 'all'
                ? 'Deliveries you finish or decline will be listed here.'
                : `No ${filter} deliveries.`
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colours.background },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.background,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.screenPadding,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    marginBottom: spacing.lg,
  },
  error: {
    fontSize: fontSize.secondary,
    color: colours.critical,
    marginBottom: spacing.md,
  },
});
