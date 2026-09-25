import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  LargeTitle,
  PressableScale,
  Screen,
  SearchBar,
  SkeletonList,
  TopBar,
  useScrollY,
} from '../../components';
import { browseListings } from '../../api/donations.api';
import { useAuth } from '../../context/AuthContext';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterListItem, useReducedMotion } from '../../theme/animations';
import type { DonationListing } from '../../types/donation';
import type { RecipientTabProps } from '../../navigation/types';
import { FoodCard } from './components/FoodCard';

type Quick = 'all' | 'urgent' | 'prepared' | 'packaged';
const PAGE_SIZE = 20;

/**
 * The recipient's home: food available now, most urgent first (the API
 * orders it that way).
 *
 * Filters are a single row of chips rather than a filter sheet: there are
 * only four useful choices, so showing them is quicker than hiding them.
 * Search waits until typing pauses before asking the server, and more
 * listings load as the list nears its end.
 */
export function BrowseListingsScreen({
  navigation,
}: RecipientTabProps<'BrowseListings'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const { user } = useAuth();
  const now = useNow();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState<Quick>('all');
  const [listings, setListings] = useState<DonationListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  // Debounce: wait for a pause in typing before searching.
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'more') => {
      const id = ++requestId.current;
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      try {
        const result = await browseListings({
          search: query || undefined,
          urgentOnly: quick === 'urgent' || undefined,
          category: quick === 'prepared' || quick === 'packaged' ? quick : undefined,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        // Ignore answers to searches the user has already moved on from.
        if (id !== requestId.current) return;
        setListings((current) =>
          mode === 'more' ? [...current, ...result.listings] : result.listings,
        );
        setTotal(result.total);
        setPage(targetPage);
        setError(null);
      } catch (err) {
        if (id === requestId.current) setError(err);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [query, quick],
  );

  useFocusEffect(
    useCallback(() => {
      void load(1, 'initial');
    }, [load]),
  );

  const canLoadMore = listings.length < total && !loadingMore && !loading;
  const filtered = !!query || quick !== 'all';
  const displayName = user?.organisationName ?? user?.name ?? '';

  const avatar = (
    <PressableScale
      onPress={() => navigation.navigate('RecipientProfile')}
      accessibilityRole="button"
      accessibilityLabel={t('tabs.profile')}
      scaleTo={0.92}
    >
      <Avatar
        name={displayName}
        size={42}
        icon={user?.organisationName ? 'mc:home-heart' : undefined}
      />
    </PressableScale>
  );

  const header = (
    <View>
      <LargeTitle
        eyebrow={t('donor.greetingName', {
          greeting: f.greeting(),
          name: user?.name.split(' ')[0] ?? '',
        })}
        title={t('recipient.browseTitle')}
        right={avatar}
        scrollY={scrollY}
      />
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={t('recipient.searchPlaceholder')}
      />
      <ChipRow style={styles.chips}>
        <Chip
          label={t('common.all')}
          selected={quick === 'all'}
          onPress={() => setQuick('all')}
        />
        <Chip
          label={t('recipient.filterUrgent')}
          icon="mc:fire"
          tone="critical"
          selected={quick === 'urgent'}
          onPress={() => setQuick('urgent')}
        />
        <Chip
          label={t('categories.prepared')}
          icon="mc:pot-steam-outline"
          selected={quick === 'prepared'}
          onPress={() => setQuick('prepared')}
        />
        <Chip
          label={t('categories.packaged')}
          icon="mc:package-variant-closed"
          selected={quick === 'packaged'}
          onPress={() => setQuick('packaged')}
        />
      </ChipRow>
      {!loading && !error && listings.length > 0 ? (
        <AppText
          variant="caption"
          color="textSecondary"
          style={styles.count}
          accessibilityLiveRegion="polite"
        >
          {t('recipient.resultCount', { count: total })}
        </AppText>
      ) : null}
    </View>
  );

  let empty: React.ReactElement;
  if (loading) empty = <SkeletonList count={3} />;
  else if (error)
    empty = <ErrorState error={error} onRetry={() => void load(1, 'initial')} />;
  else if (filtered)
    empty = (
      <EmptyState
        compact
        illustration="emptyBowl"
        title={t('recipient.noMatchTitle')}
        message={t('recipient.noMatchBody')}
        actionLabel={t('recipient.clearFilters')}
        onAction={() => {
          setSearch('');
          setQuick('all');
        }}
      />
    );
  else
    empty = (
      <EmptyState
        illustration="emptyBowl"
        title={t('recipient.browseEmptyTitle')}
        message={t('recipient.browseEmptyBody')}
      />
    );

  return (
    <Screen>
      <TopBar title={t('recipient.browseTitle')} scrollY={scrollY} right={avatar} />
      <Animated.FlatList
        data={loading || error ? [] : listings}
        keyExtractor={(item) => String(item.listingId)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          loadingMore ? (
            <View
              style={styles.more}
              accessible
              accessibilityLabel={t('recipient.loadingMore')}
            >
              <ActivityIndicator color={theme.colors.brand} />
            </View>
          ) : null
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (canLoadMore) void load(page + 1, 'more');
        }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(1, 'refresh')}
            tintColor={theme.colors.brand}
            colors={[theme.colors.brand]}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterListItem(index % PAGE_SIZE, reduced)}>
            <FoodCard
              listing={item}
              now={now}
              onPress={() =>
                navigation.navigate('ListingDetail', { listingId: item.listingId })
              }
            />
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
  chips: { marginTop: t.spacing.sm + 4, marginBottom: t.spacing.sm },
  count: { marginBottom: t.spacing.sm + 4 },
  more: { paddingVertical: t.spacing.lg },
}));
