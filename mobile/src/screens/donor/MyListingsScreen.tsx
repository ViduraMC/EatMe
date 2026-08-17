import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, EmptyState, ScreenContainer, StatusPill } from '../../components';
import { fetchMyListings } from '../../api/donations.api';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime, formatStatus, formatTimeUntil } from '../../utils/datetime';
import type { DonationListing, UrgencyLevel } from '../../types/donation';
import type { DonorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DonorStackParamList, 'MyListings'>;

/** The most pressing item in a listing decides the colour of its pill. */
function worstUrgency(listing: DonationListing): UrgencyLevel {
  if (listing.items.some((i) => i.urgencyLevel === 'critical')) return 'critical';
  if (listing.items.some((i) => i.urgencyLevel === 'urgent')) return 'urgent';
  return 'safe';
}

/** The soonest expiry across the listing's items, which is what a donor acts on. */
function soonestExpiry(listing: DonationListing): string | null {
  const dates = listing.items
    .map((i) => i.effectiveExpiry)
    .filter((d): d is string => !!d)
    .sort();
  return dates[0] ?? null;
}

export function MyListingsScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [listings, setListings] = useState<DonationListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setListings(await fetchMyListings());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * Reloads every time the screen comes back into focus, so a listing just
   * published on AddItems appears without the donor having to pull to refresh.
   */
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{user?.organisationName ?? user?.name}</Text>
          <Text style={styles.subtitle}>
            {listings.length === 0
              ? 'No listings yet'
              : `${listings.length} listing${listings.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Button
          label="Log Out"
          variant="secondary"
          onPress={() => void logout()}
          style={styles.logout}
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={listings}
        keyExtractor={(item) => String(item.listingId)}
        refreshing={refreshing}
        onRefresh={() => void load(true)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={listings.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={
          <EmptyState
            title="No listings yet"
            message="Publish surplus food and recipients nearby can request it before it spoils."
            actionLabel="Create your first listing"
            onAction={() => navigation.navigate('CreateListing')}
          />
        }
        renderItem={({ item }) => {
          const urgency = worstUrgency(item);
          const expiry = soonestExpiry(item);
          const isClosed = item.status === 'cancelled' || item.status === 'expired';

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
                <StatusPill
                  label={formatStatus(item.status)}
                  tone={isClosed ? 'neutral' : urgency}
                />
              </View>

              <Text style={styles.cardMeta}>
                {item.items.length} item{item.items.length === 1 ? '' : 's'}
                {expiry && !isClosed
                  ? ` · soonest expires ${formatTimeUntil(expiry)}`
                  : ''}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                Pickup {formatDateTime(item.pickupWindowStart)}
              </Text>
            </Card>
          );
        }}
      />

      {listings.length > 0 && (
        <Button
          label="+ New Listing"
          onPress={() => navigation.navigate('CreateListing')}
          style={styles.newButton}
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
  logout: { paddingHorizontal: spacing.md },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
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
  newButton: { marginTop: spacing.sm },
});
