import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  Screen,
  SearchBar,
  SkeletonList,
} from '../../../components';
import { useI18n } from '../../../i18n';
import { makeStyles, useTheme, type Tone } from '../../../theme';
import {
  enterListItem,
  layoutTransition,
  useReducedMotion,
} from '../../../theme/animations';

export interface StatusOption<S extends string> {
  value: S;
  label: string;
  tone: Tone;
}

interface RecordListProps<T, S extends string> {
  load: () => Promise<T[]>;
  keyOf: (item: T) => number;
  statusOf: (item: T) => S;
  statuses: StatusOption<S>[];
  /** Lower-cased text the search box matches against. */
  searchText: (item: T) => string;
  searchPlaceholder: string;
  emptyText: string;
  renderItem: (item: T, replace: (next: T) => void) => React.ReactElement;
}

/**
 * The shared body of the admin's three read-mostly screens (listings,
 * requests, deliveries): a search box, one chip per status with its count,
 * and a newest-first list that animates as filters change.
 *
 * Kept in one place so the three screens behave identically, which is what
 * lets an administrator learn the pattern once (consistency heuristic).
 */
export function RecordList<T extends { createdAt: string }, S extends string>({
  load,
  keyOf,
  statusOf,
  statuses,
  searchText,
  searchPlaceholder,
  emptyText,
  renderItem,
}: RecordListProps<T, S>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const reduced = useReducedMotion();

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<S | 'all'>('all');

  const fetch = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        setItems(await load());
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [load],
  );

  useFocusEffect(
    useCallback(() => {
      void fetch();
    }, [fetch]),
  );

  const counts = useMemo(() => {
    const map = new Map<S, number>();
    for (const i of items) map.set(statusOf(i), (map.get(statusOf(i)) ?? 0) + 1);
    return map;
  }, [items, statusOf]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => status === 'all' || statusOf(i) === status)
      .filter((i) => !q || searchText(i).includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, query, status, statusOf, searchText]);

  const replace = (next: T) =>
    setItems((list) => list.map((i) => (keyOf(i) === keyOf(next) ? next : i)));

  const header = (
    <View style={styles.header}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={searchPlaceholder}
        style={styles.search}
      />
      <ChipRow>
        <Chip
          label={t('common.all')}
          count={items.length}
          selected={status === 'all'}
          onPress={() => setStatus('all')}
        />
        {statuses.map((s) => (
          <Chip
            key={s.value}
            label={s.label}
            tone={s.tone}
            count={counts.get(s.value) ?? 0}
            selected={status === s.value}
            onPress={() => setStatus(s.value)}
          />
        ))}
      </ChipRow>
    </View>
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={4} />;
  else if (error) empty = <ErrorState error={error} onRetry={() => void fetch()} />;
  else
    empty = (
      <EmptyState
        compact
        illustration="emptyBowl"
        title={emptyText}
        actionLabel={query || status !== 'all' ? t('recipient.clearFilters') : undefined}
        onAction={() => {
          setQuery('');
          setStatus('all');
        }}
      />
    );

  return (
    <Screen edges={['left', 'right']}>
      <Animated.FlatList
        data={loading || error ? [] : visible}
        keyExtractor={(i) => String(keyOf(i))}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetch(true)}
            tintColor={theme.colors.brand}
            colors={[theme.colors.brand]}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={enterListItem(index, reduced)}
            layout={layoutTransition(reduced)}
          >
            {renderItem(item, replace)}
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
  header: { paddingTop: t.spacing.md, paddingBottom: t.spacing.md },
  search: { marginBottom: t.spacing.sm + 4 },
  gap: { height: t.spacing.sm + 2 },
}));
