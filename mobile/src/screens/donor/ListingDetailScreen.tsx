import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, ScreenContainer, StatusPill } from '../../components';
import { cancelListing, fetchListing } from '../../api/donations.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime, formatStatus, formatTimeUntil } from '../../utils/datetime';
import type { DonationListing } from '../../types/donation';
import type { DonorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DonorStackParamList, 'ListingDetail'>;

export function ListingDetailScreen({ navigation, route }: Props) {
  const { listingId } = route.params;
  const [listing, setListing] = useState<DonationListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setListing(await fetchListing(listingId));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function confirmCancel() {
    /*
     * Cancelling is a soft cancel, so nothing is destroyed, but recipients
     * lose sight of the listing immediately. Worth one confirmation.
     */
    Alert.alert(
      'Cancel this listing?',
      'Recipients will no longer see it. The listing stays in your history and cannot be edited afterwards.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel listing',
          style: 'destructive',
          onPress: () => void doCancel(),
        },
      ],
    );
  }

  async function doCancel() {
    setCancelling(true);
    setError(null);
    try {
      await cancelListing(listingId);
      /*
       * Back to My Listings rather than staying here. The listing is not gone,
       * it is cancelled, and seeing it sitting in the list with a cancelled
       * pill is what makes the soft cancel obvious. My Listings reloads on
       * focus, so navigating back is also the refresh.
       */
      navigation.navigate('MyListings');
    } catch (err) {
      setError(getErrorMessage(err));
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (!listing) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>{error ?? 'That listing could not be loaded'}</Text>
        <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const isClosed = listing.status === 'cancelled' || listing.status === 'expired';

  return (
    <ScreenContainer scroll>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{listing.title}</Text>
        <StatusPill label={formatStatus(listing.status)} tone="neutral" />
      </View>

      {!!listing.description && (
        <Text style={styles.description}>{listing.description}</Text>
      )}

      <Card style={styles.card}>
        <Text style={styles.cardHeading}>Pickup</Text>
        <Text style={styles.body}>{listing.pickupAddress}</Text>
        <Text style={styles.meta}>
          {formatDateTime(listing.pickupWindowStart)} to{' '}
          {formatDateTime(listing.pickupWindowEnd)}
        </Text>
      </Card>

      <Text style={styles.sectionHeading}>
        {listing.items.length} item{listing.items.length === 1 ? '' : 's'}
      </Text>

      {listing.items.map((item) => {
        const claimed = Number(item.quantity) - Number(item.quantityRemaining);
        return (
          <Card key={item.itemId}>
            <View style={styles.itemTop}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.foodName}
              </Text>
              <StatusPill
                label={item.urgencyLevel}
                tone={isClosed ? 'neutral' : item.urgencyLevel}
              />
            </View>

            <Text style={styles.meta}>
              {item.quantityRemaining} of {item.quantity} {item.unit} left
              {claimed > 0 ? ` · ${claimed} claimed` : ''}
            </Text>

            <Text style={styles.meta}>
              {item.category} · {item.storageType}
            </Text>

            <Text style={styles.meta}>
              {item.category === 'prepared'
                ? `Prepared ${formatDateTime(item.preparedAt)}, safe ${item.safeWindowHours}h`
                : `Use by ${formatDateTime(item.expiryDate)}`}
            </Text>

            <Text style={[styles.expiry, !isClosed && styles[item.urgencyLevel]]}>
              Expires {formatTimeUntil(item.effectiveExpiry)}
            </Text>
          </Card>
        );
      })}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!isClosed && (
        <Button
          label="Cancel this listing"
          variant="danger"
          onPress={confirmCancel}
          loading={cancelling}
          style={styles.cancel}
        />
      )}

      {listing.status === 'cancelled' && (
        <Text style={styles.closedNote}>
          This listing was cancelled. It stays here for your records but recipients cannot
          see it.
        </Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  description: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  card: { marginTop: spacing.md },
  cardHeading: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  body: { fontSize: fontSize.body, color: colours.textPrimary },
  meta: { fontSize: fontSize.secondary, color: colours.textSecondary, lineHeight: 20 },
  expiry: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
    color: colours.textSecondary,
  },
  critical: { color: colours.critical },
  urgent: { color: colours.urgent },
  safe: { color: colours.safe },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginTop: spacing.md,
  },
  cancel: { marginTop: spacing.lg },
  closedNote: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.lg,
    lineHeight: 20,
  },
});
