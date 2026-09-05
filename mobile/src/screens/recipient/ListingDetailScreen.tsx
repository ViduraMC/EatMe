import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, ScreenContainer, StatusPill } from '../../components';
import { fetchListing } from '../../api/donations.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime, formatStatus, formatTimeUntil } from '../../utils/datetime';
import type { DonationListing } from '../../types/donation';
import type { RecipientStackParamList } from '../../navigation/types';

type ListingDetailParamList = RecipientStackParamList & {
  ListingDetail: { listingId: number };
  CreateRequest: { listingId: number };
};

type Props = NativeStackScreenProps<ListingDetailParamList, 'ListingDetail'>;

export function ListingDetailScreen({ navigation, route }: Props) {
  const { listingId } = route.params;
  const [listing, setListing] = useState<DonationListing | null>(null);
  const [loading, setLoading] = useState(true);
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

  /*
   * Detail returns a listing whatever its status, unlike browse. A listing
   * that has been cancelled or fully claimed since the list was loaded must
   * not offer a request button.
   */
  const canRequest = listing.status === 'open' || listing.status === 'partially_claimed';
  const hasStock = listing.items.some((i) => Number(i.quantityRemaining) > 0);

  return (
    <ScreenContainer scroll>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{listing.title}</Text>
        <StatusPill label={formatStatus(listing.status)} tone="neutral" />
      </View>

      <Text style={styles.donor}>
        {listing.donor.organisationName ?? listing.donor.name}
      </Text>

      {!!listing.description && (
        <Text style={styles.description}>{listing.description}</Text>
      )}

      <Card style={styles.card}>
        <Text style={styles.cardHeading}>Collection</Text>
        <Text style={styles.body}>{listing.pickupAddress}</Text>
        <Text style={styles.meta}>
          {formatDateTime(listing.pickupWindowStart)} to{' '}
          {formatDateTime(listing.pickupWindowEnd)}
        </Text>
      </Card>

      <Text style={styles.sectionHeading}>Available items</Text>

      {listing.items.map((item) => {
        const remaining = Number(item.quantityRemaining);
        return (
          <Card key={item.itemId}>
            <View style={styles.itemTop}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.foodName}
              </Text>
              <StatusPill label={item.urgencyLevel} tone={item.urgencyLevel} />
            </View>

            <Text style={styles.meta}>
              {remaining > 0
                ? `${item.quantityRemaining} ${item.unit} available`
                : 'None left'}
            </Text>
            <Text style={styles.meta}>
              {item.category} · {item.storageType}
            </Text>
            <Text style={[styles.expiry, styles[item.urgencyLevel]]}>
              Expires {formatTimeUntil(item.effectiveExpiry)}
            </Text>
          </Card>
        );
      })}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {canRequest && hasStock ? (
        <Button
          label="Request This Food"
          onPress={() => navigation.navigate('CreateRequest', { listingId })}
          style={styles.request}
        />
      ) : (
        <Text style={styles.closedNote}>
          {canRequest
            ? 'Every item on this listing has been claimed.'
            : 'This listing is no longer accepting requests.'}
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
  donor: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.xs,
  },
  description: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
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
  },
  critical: { color: colours.critical },
  urgent: { color: colours.urgent },
  safe: { color: colours.safe },
  request: { marginTop: spacing.lg },
  closedNote: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  error: { color: colours.critical, fontSize: fontSize.secondary, marginTop: spacing.md },
});
