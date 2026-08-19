import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import type { ApiSuccess, UserStatus } from '../../types';

type ListingStatus =
  'open' | 'partially_claimed' | 'fully_claimed' | 'expired' | 'cancelled';

interface AdminListingDonor {
  userId: number;
  name: string;
  email: string;
  phone: string;
  organisationName: string | null;
  status: UserStatus;
}

interface AdminListing {
  listingId: number;
  donorId: number;
  title: string;
  description: string | null;
  pickupAddress: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  donor: AdminListingDonor;
  _count: {
    requests: number;
  };
}

type ListingsResponse = ApiSuccess<{
  listings: AdminListing[];
}>;

type StatusFilter = 'all' | ListingStatus;

const statusFilters: Array<{
  label: string;
  value: StatusFilter;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Partially claimed', value: 'partially_claimed' },
  { label: 'Fully claimed', value: 'fully_claimed' },
  { label: 'Expired', value: 'expired' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatStatus(status: ListingStatus): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getStatusStyle(status: ListingStatus) {
  if (status === 'open') {
    return {
      backgroundColor: '#DCFCE7',
      textColor: colours.safe,
    };
  }

  if (status === 'partially_claimed') {
    return {
      backgroundColor: '#FEF3C7',
      textColor: colours.urgent,
    };
  }

  if (status === 'fully_claimed') {
    return {
      backgroundColor: '#E0F2FE',
      textColor: '#0369A1',
    };
  }

  if (status === 'expired' || status === 'cancelled') {
    return {
      backgroundColor: '#FEE2E2',
      textColor: colours.critical,
    };
  }

  return {
    backgroundColor: colours.surface,
    textColor: colours.textSecondary,
  };
}

export function AdminListingsScreen() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadListings = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) {
      setIsLoading(true);
    }

    try {
      setErrorMessage(null);

      const response = await api.get<ListingsResponse>('/admin/listings');

      setListings(response.data.data.listings);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadListings(true);
  }, [loadListings]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadListings();
  }, [loadListings]);

  const filteredListings = useMemo(() => {
    const normalisedQuery = searchQuery.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalisedQuery) {
        return true;
      }

      const donorName = listing.donor.name.toLowerCase();
      const organisation = listing.donor.organisationName?.toLowerCase() ?? '';

      return (
        listing.title.toLowerCase().includes(normalisedQuery) ||
        donorName.includes(normalisedQuery) ||
        organisation.includes(normalisedQuery) ||
        listing.pickupAddress.toLowerCase().includes(normalisedQuery)
      );
    });
  }, [listings, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colours.accent} />
        <Text style={styles.stateText}>Loading donation listings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colours.accent}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>LISTING MONITORING</Text>

        <Text style={styles.title}>Donation Listings</Text>

        <Text style={styles.subtitle}>
          Review donation activity across the platform and monitor each listing's current
          status.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{listings.length}</Text>
          <Text style={styles.summaryLabel}>Total listings</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {listings.filter((listing) => listing.status === 'open').length}
          </Text>
          <Text style={styles.summaryLabel}>Open listings</Text>
        </View>
      </View>

      <View style={styles.searchSection}>
        <Text style={styles.fieldLabel}>Search listings</Text>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Title, donor, organisation or address"
          placeholderTextColor={colours.textSecondary}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.fieldLabel}>Status</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {statusFilters.map((filter) => {
            const selected = statusFilter === filter.value;

            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                onPress={() => setStatusFilter(filter.value)}
                style={({ pressed }) => [
                  styles.filterChip,
                  selected && styles.filterChipSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selected && styles.filterChipTextSelected,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not load listings</Text>

          <Text style={styles.errorMessage}>{errorMessage}</Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            onPress={() => {
              void loadListings(true);
            }}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!errorMessage && filteredListings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No listings found</Text>

          <Text style={styles.emptyText}>
            Try another search term or change the selected status filter.
          </Text>
        </View>
      ) : null}

      {filteredListings.map((listing) => {
        const statusStyle = getStatusStyle(listing.status);
        const donorDisplayName = listing.donor.organisationName || listing.donor.name;

        return (
          <View key={listing.listingId} style={styles.listingCard}>
            <View style={styles.listingHeader}>
              <View style={styles.listingHeaderText}>
                <Text style={styles.listingTitle}>{listing.title}</Text>

                <Text style={styles.listingId}>Listing #{listing.listingId}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusStyle.backgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: statusStyle.textColor,
                    },
                  ]}
                >
                  {formatStatus(listing.status)}
                </Text>
              </View>
            </View>

            {listing.description ? (
              <Text style={styles.description}>{listing.description}</Text>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Donor</Text>
              <Text style={styles.detailValue}>{donorDisplayName}</Text>

              {listing.donor.organisationName ? (
                <Text style={styles.detailSupporting}>Contact: {listing.donor.name}</Text>
              ) : null}

              <Text style={styles.detailSupporting}>{listing.donor.email}</Text>

              <Text style={styles.detailSupporting}>{listing.donor.phone}</Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Pickup location</Text>
              <Text style={styles.detailValue}>{listing.pickupAddress}</Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Pickup window</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(listing.pickupWindowStart)}
              </Text>
              <Text style={styles.detailSupporting}>
                Until {formatDateTime(listing.pickupWindowEnd)}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataValue}>{listing._count.requests}</Text>
                <Text style={styles.metadataLabel}>Requests</Text>
              </View>

              <View style={styles.metadataDivider} />

              <View style={styles.metadataItem}>
                <Text style={styles.metadataValue}>{formatDate(listing.createdAt)}</Text>
                <Text style={styles.metadataLabel}>Created</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.background,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colours.background,
  },
  stateText: {
    marginTop: spacing.md,
    fontSize: fontSize.body,
    color: colours.textSecondary,
    textAlign: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    marginBottom: spacing.sm,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.accent,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.body,
    lineHeight: 24,
    color: colours.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  summaryCard: {
    width: '48%',
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  summaryValue: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  summaryLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },
  searchSection: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.sm,
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  searchInput: {
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
    fontSize: fontSize.body,
    color: colours.textPrimary,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterRow: {
    paddingRight: spacing.md,
  },
  filterChip: {
    minHeight: 40,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  filterChipSelected: {
    borderColor: colours.accent,
    backgroundColor: colours.accent,
  },
  filterChipText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
  },
  filterChipTextSelected: {
    color: colours.textInverse,
  },
  errorCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.critical,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  errorTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.critical,
  },
  errorMessage: {
    marginTop: spacing.sm,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: layout.controlHeight,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    backgroundColor: colours.critical,
  },
  retryButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  emptyTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
    textAlign: 'center',
  },
  listingCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  listingHeaderText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  listingTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  listingId: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  statusBadge: {
    maxWidth: '44%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius,
  },
  statusBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.md,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },
  divider: {
    height: layout.borderWidth,
    marginVertical: spacing.md,
    backgroundColor: colours.border,
  },
  detailGroup: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    marginBottom: spacing.xs,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },
  detailSupporting: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: layout.borderWidth,
    borderTopColor: colours.border,
  },
  metadataItem: {
    flex: 1,
  },
  metadataDivider: {
    width: layout.borderWidth,
    marginHorizontal: spacing.md,
    backgroundColor: colours.border,
  },
  metadataValue: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  metadataLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
