import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import {
  Avatar,
  Button,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  InfoBanner,
  LargeTitle,
  PressableScale,
  Screen,
  SkeletonList,
  StatTile,
  TopBar,
  useScrollY,
} from '../../components';
import { fetchMyListings, fetchPendingConfirmations } from '../../api/donations.api';
import { useAuth } from '../../context/AuthContext';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { useFormat } from '../../i18n/format';
import { makeStyles, useTheme } from '../../theme';
import { enterListItem, enterSection, useReducedMotion } from '../../theme/animations';
import type { DonationListing } from '../../types/donation';
import { isActiveListing, isClaimed, isClosedListing } from '../../utils/listing';
import type { DonorTabProps } from '../../navigation/types';
import { ListingCard } from './components/ListingCard';
import { setPendingPickups } from './pickupBadge';

type Filter = 'all' | 'active' | 'claimed' | 'closed';

function matches(listing: DonationListing, filter: Filter): boolean {
  switch (filter) {
    case 'active':
      return isActiveListing(listing.status);
    case 'claimed':
      return listing.status === 'partially_claimed' || listing.status === 'fully_claimed';
    case 'closed':
      return isClosedListing(listing.status);
    default:
      return true;
  }
}

/**
 * The donor's home tab.
 *
 * Opens with how things stand (three live numbers), then anything that needs
 * them (a pickup waiting for their confirmation), then their listings. The
 * "Expiring soon" count is deliberate: it is the number a donor can still act
 * on, by sharing or collecting that food quickly.
 */
export function MyListingsScreen({ navigation }: DonorTabProps<'MyListings'>) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const f = useFormat();
  const { user } = useAuth();
  const now = useNow();
  const reduced = useReducedMotion();
  const { scrollY, onScroll } = useScrollY();

  const [listings, setListings] = useState<DonationListing[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [mine, waiting] = await Promise.all([
        fetchMyListings(),
        fetchPendingConfirmations(),
      ]);
      setListings(mine);
      const needsMe = waiting.filter((a) => !a.pickupDonorConfirmedAt).length;
      setPending(needsMe);
      setPendingPickups(needsMe);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever the tab comes back into focus, so a listing just
  // published appears without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const stats = useMemo(() => {
    const active = listings.filter((l) => isActiveListing(l.status));
    return {
      active: active.length,
      claimed: listings.reduce((n, l) => n + l.items.filter(isClaimed).length, 0),
      expiring: active.reduce(
        (n, l) =>
          n +
          l.items.filter(
            (i) =>
              Number(i.quantityRemaining) > 0 &&
              (i.urgencyLevel === 'critical' || i.urgencyLevel === 'urgent'),
          ).length,
        0,
      ),
    };
  }, [listings]);

  const counts = useMemo(
    () => ({
      all: listings.length,
      active: listings.filter((l) => matches(l, 'active')).length,
      claimed: listings.filter((l) => matches(l, 'claimed')).length,
      closed: listings.filter((l) => matches(l, 'closed')).length,
    }),
    [listings],
  );

  const visible = listings.filter((l) => matches(l, filter));
  const firstName = user?.name.split(' ')[0] ?? '';
  const displayName = user?.organisationName ?? user?.name ?? '';

  const avatar = (
    <PressableScale
      onPress={() => navigation.navigate('DonorProfile')}
      accessibilityRole="button"
      accessibilityLabel={t('tabs.profile')}
      scaleTo={0.92}
    >
      <Avatar
        name={displayName}
        size={42}
        icon={user?.organisationName ? 'business' : undefined}
      />
    </PressableScale>
  );

  const header = (
    <View>
      <LargeTitle
        eyebrow={t('donor.greetingName', { greeting: f.greeting(), name: firstName })}
        title={t('donor.homeTitle')}
        right={avatar}
        scrollY={scrollY}
      />
      {!loading && !error && listings.length > 0 ? (
        <>
          <Animated.View entering={enterSection(0, reduced)} style={styles.stats}>
            <StatTile
              label={t('donor.statActive')}
              value={stats.active}
              icon="mc:basket-outline"
              tone="brand"
            />
            <StatTile
              label={t('donor.statClaimed')}
              value={stats.claimed}
              icon="mc:hand-heart-outline"
              tone="olive"
            />
            <StatTile
              label={t('donor.statExpiring')}
              value={stats.expiring}
              icon="mc:fire"
              tone={stats.expiring > 0 ? 'critical' : 'neutral'}
            />
          </Animated.View>

          {pending > 0 ? (
            <Animated.View entering={enterSection(1, reduced)}>
              <InfoBanner
                tone="brand"
                icon="mc:handshake-outline"
                title={t('donor.pickupsWaiting', { count: pending })}
                message={t('donor.pickupsWaitingBody')}
                action={
                  <Button
                    label={t('donor.confirmNow')}
                    size="sm"
                    inline
                    iconRight="arrow-forward"
                    onPress={() => navigation.navigate('ConfirmPickup')}
                  />
                }
              />
            </Animated.View>
          ) : null}

          <Animated.View entering={enterSection(2, reduced)}>
            <ChipRow style={styles.chips}>
              <Chip
                label={t('common.all')}
                count={counts.all}
                selected={filter === 'all'}
                onPress={() => setFilter('all')}
              />
              <Chip
                label={t('donor.filterActive')}
                count={counts.active}
                selected={filter === 'active'}
                onPress={() => setFilter('active')}
              />
              <Chip
                label={t('donor.filterClaimed')}
                count={counts.claimed}
                selected={filter === 'claimed'}
                onPress={() => setFilter('claimed')}
              />
              <Chip
                label={t('donor.filterClosed')}
                count={counts.closed}
                selected={filter === 'closed'}
                onPress={() => setFilter('closed')}
              />
            </ChipRow>
          </Animated.View>
        </>
      ) : null}
    </View>
  );

  let empty: React.ReactElement | null = null;
  if (loading) {
    empty = <SkeletonList count={3} />;
  } else if (error) {
    empty = <ErrorState error={error} onRetry={() => void load()} />;
  } else if (listings.length === 0) {
    empty = (
      <EmptyState
        illustration="shareFood"
        title={t('donor.emptyTitle')}
        message={t('donor.emptyBody')}
        actionLabel={t('donor.emptyAction')}
        onAction={() => navigation.navigate('CreateListing')}
      />
    );
  } else {
    empty = (
      <EmptyState
        compact
        illustration="emptyBowl"
        title={t('donor.filterEmptyTitle')}
        message={t('donor.filterEmptyBody')}
      />
    );
  }

  return (
    <Screen>
      <TopBar title={t('donor.homeTitle')} scrollY={scrollY} right={avatar} />
      <Animated.FlatList
        data={loading || error ? [] : visible}
        keyExtractor={(item) => String(item.listingId)}
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
            progressBackgroundColor={theme.colors.surface}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterListItem(index, reduced)}>
            <ListingCard
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
  stats: { flexDirection: 'row', gap: t.spacing.sm + 2, marginBottom: t.spacing.md },
  chips: { marginBottom: t.spacing.md },
}));
