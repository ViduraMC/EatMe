import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card, EmptyState, Input, ScreenContainer, StatusPill } from '../../components';
import { browseListings } from '../../api/donations.api';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { formatTimeUntil } from '../../utils/datetime';
import type { DonationListing, ItemCategory, UrgencyLevel } from '../../types/donation';
import type { RecipientStackParamList } from '../../navigation/types';

type BrowseListingsParamList = RecipientStackParamList & {
  BrowseListings: undefined;
  ListingDetail: { listingId: number };
};

type Props = NativeStackScreenProps<BrowseListingsParamList, 'BrowseListings'>;

/** The most pressing item in a listing decides the colour of its pill. */
function worstUrgency(listing: DonationListing): UrgencyLevel {
  if (listing.items.some((i) => i.urgencyLevel === 'critical')) return 'critical';
  if (listing.items.some((i) => i.urgencyLevel === 'urgent')) return 'urgent';
  return 'safe';
}

/** The soonest expiry across the listing, which is what a recipient acts on. */
function soonestExpiry(listing: DonationListing): string | null {
  const dates = listing.items
    .map((i) => i.effectiveExpiry)
    .filter((d): d is string => !!d)
    .sort();
  return dates[0] ?? null;
}

/**
 * US-R01: browse available food.
 *
 * The API does the ordering and filtering. Listings arrive urgent first then
 * by soonest expiry, with expired food and empty items already excluded, so
 * this screen never re-sorts: doing so would fight the server's ordering and
 * break pagination.
 */
export function BrowseListingsScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  const [listings, setListings] = useState<DonationListing[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (
      term: string,
      cat: ItemCategory | null,
      urgent: boolean,
      isRefresh = false,
    ) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        const result = await browseListings({
          search: term.trim() || undefined,
          category: cat ?? undefined,
          urgentOnly: urgent || undefined,
          limit: 50,
        });
        setListings(result.listings);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  /*
   * Debounced so typing does not fire a request per keystroke. 350ms is long
   * enough to finish a word and short enough not to feel laggy.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      void load(search, category, urgentOnly);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, category, urgentOnly, load]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{user?.organisationName ?? user?.name}</Text>
          <Text style={styles.subtitle}>Available food near you</Text>
        </View>
        <Pressable onPress={() => void logout()} accessibilityRole="button">
          <Text style={styles.logout}>Log Out</Text>
        </Pressable>
      </View>

      <Input
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Bread, rice, curry..."
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setUrgentOnly((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: urgentOnly }}
          style={[styles.chip, urgentOnly && styles.chipOn]}
        >
          <Text style={[styles.chipText, urgentOnly && styles.chipTextOn]}>
            Urgent only
          </Text>
        </Pressable>

        {(['packaged', 'prepared'] as ItemCategory[]).map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory((current) => (current === c ? null : c))}
            accessibilityRole="radio"
            accessibilityState={{ selected: category === c }}
            style={[styles.chip, category === c && styles.chipOn]}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextOn]}>
              {c}
            </Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => String(l.listingId)}
          refreshing={refreshing}
          onRefresh={() => void load(search, category, urgentOnly, true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={listings.length === 0 ? styles.emptyWrap : undefined}
          ListEmptyComponent={
            <EmptyState
              title={
                search || category || urgentOnly ? 'Nothing matches' : 'No food available'
              }
              message={
                search || category || urgentOnly
                  ? 'Try clearing the search or the filters.'
                  : 'When a donor posts surplus food, it appears here with the most urgent first.'
              }
            />
          }
          renderItem={({ item }) => {
            const urgency = worstUrgency(item);
            const expiry = soonestExpiry(item);

            return (
              <Card
                onPress={() =>
                  navigation.navigate('ListingDetail', { listingId: item.listingId })
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <StatusPill label={urgency} tone={urgency} />
                </View>

                <Text style={styles.cardMeta} numberOfLines={1}>
                  {item.donor.organisationName ?? item.donor.name}
                </Text>

                <Text style={styles.cardMeta}>
                  {item.items.length} item{item.items.length === 1 ? '' : 's'}
                  {expiry ? ` · soonest expires ${formatTimeUntil(expiry)}` : ''}
                </Text>

                <Text style={styles.cardItems} numberOfLines={2}>
                  {item.items.map((i) => i.foodName).join(', ')}
                </Text>
              </Card>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerText: { flexShrink: 1 },
  greeting: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  subtitle: { fontSize: fontSize.secondary, color: colours.textSecondary },
  logout: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
    paddingVertical: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  chipOn: { borderColor: colours.accent, backgroundColor: colours.surface },
  chipText: { fontSize: fontSize.secondary, color: colours.textSecondary },
  chipTextOn: { color: colours.accent, fontWeight: fontWeight.semibold },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  cardMeta: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    lineHeight: 20,
  },
  cardItems: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
});
