import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

type CancelListingResponse = ApiSuccess<{
  listing: AdminListing;
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

  const [menuListingId, setMenuListingId] = useState<number | null>(null);
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null);
  const [isModerationModalVisible, setIsModerationModalVisible] = useState(false);
  const [moderatingListingId, setModeratingListingId] = useState<number | null>(null);

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
    setMenuListingId(null);
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

  const openModerationModal = useCallback((listing: AdminListing) => {
    setMenuListingId(null);
    setSelectedListing(listing);
    setIsModerationModalVisible(true);
  }, []);

  const closeModerationModal = useCallback(() => {
    if (moderatingListingId !== null) {
      return;
    }

    setIsModerationModalVisible(false);
    setSelectedListing(null);
  }, [moderatingListingId]);

  const cancelListing = useCallback(async (listing: AdminListing) => {
    setModeratingListingId(listing.listingId);

    try {
      const response = await api.patch<CancelListingResponse>(
        `/admin/listings/${listing.listingId}/cancel`,
      );

      const updatedListing = response.data.data.listing;

      setListings((currentListings) =>
        currentListings.map((currentListing) =>
          currentListing.listingId === updatedListing.listingId
            ? updatedListing
            : currentListing,
        ),
      );

      setIsModerationModalVisible(false);
      setSelectedListing(null);

      Alert.alert(
        'Listing cancelled',
        `"${listing.title}" has been cancelled successfully.`,
      );
    } catch (error) {
      Alert.alert('Could not cancel listing', getErrorMessage(error));
    } finally {
      setModeratingListingId(null);
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colours.accent} />
        <Text style={styles.stateText}>Loading donation listings...</Text>
      </View>
    );
  }

  return (
    <>
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
        onScrollBeginDrag={() => setMenuListingId(null)}
      >
        <Text style={styles.title}>All Listings</Text>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search listings"
          placeholderTextColor={colours.textSecondary}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled"
        >
          {statusFilters.map((filter) => {
            const selected = statusFilter === filter.value;

            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                onPress={() => {
                  setStatusFilter(filter.value);
                  setMenuListingId(null);
                }}
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

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load listings</Text>

            <Text style={styles.errorMessage}>{errorMessage}</Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
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

        {!errorMessage
          ? filteredListings.map((listing) => {
              const statusStyle = getStatusStyle(listing.status);
              const donorDisplayName =
                listing.donor.organisationName || listing.donor.name;

              const menuOpen = menuListingId === listing.listingId;

              return (
                <View key={listing.listingId} style={styles.listingRow}>
                  <View style={styles.rowTop}>
                    <View style={styles.rowMain}>
                      <Text style={styles.listingTitle} numberOfLines={2}>
                        {listing.title}
                      </Text>

                      <Text style={styles.listingDonor} numberOfLines={1}>
                        {donorDisplayName}
                      </Text>
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

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Actions for ${listing.title}`}
                      hitSlop={10}
                      onPress={() =>
                        setMenuListingId((currentId) =>
                          currentId === listing.listingId ? null : listing.listingId,
                        )
                      }
                      style={({ pressed }) => [
                        styles.menuButton,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.menuButtonText}>⋮</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.listingAddress} numberOfLines={1}>
                    {listing.pickupAddress}
                  </Text>

                  <View style={styles.rowFooter}>
                    <Text style={styles.listingMeta}>Listing #{listing.listingId}</Text>

                    <Text style={styles.listingMeta}>
                      {listing._count.requests}{' '}
                      {listing._count.requests === 1 ? 'request' : 'requests'}
                    </Text>
                  </View>

                  {menuOpen ? (
                    <View style={styles.actionMenu}>
                      {listing.status === 'open' ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => openModerationModal(listing)}
                          style={({ pressed }) => [
                            styles.actionMenuItem,
                            pressed && styles.actionMenuItemPressed,
                          ]}
                        >
                          <Text style={styles.destructiveMenuText}>Cancel listing</Text>
                        </Pressable>
                      ) : (
                        <View style={styles.actionMenuItem}>
                          <Text style={styles.unavailableMenuText}>
                            No moderation actions
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })
          : null}

        {!errorMessage && listings.length > 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoMark}>i</Text>

            <Text style={styles.infoText}>
              Listing records remain available after their status changes so platform
              activity can still be reviewed.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={isModerationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModerationModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModerationModal} />

          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Text style={styles.modalIconText}>!</Text>
            </View>

            <Text style={styles.modalTitle}>Cancel this listing?</Text>

            <Text style={styles.modalDescription}>
              {selectedListing
                ? `"${selectedListing.title}" will no longer remain open on the platform. The listing record and its history will be preserved.`
                : 'This listing will no longer remain open on the platform.'}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={moderatingListingId !== null}
                onPress={closeModerationModal}
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalSecondaryButtonText}>Keep listing</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={moderatingListingId !== null || selectedListing === null}
                onPress={() => {
                  if (selectedListing) {
                    void cancelListing(selectedListing);
                  }
                }}
                style={({ pressed }) => [
                  styles.modalDestructiveButton,
                  moderatingListingId !== null && styles.buttonDisabled,
                  pressed && moderatingListingId === null && styles.buttonPressed,
                ]}
              >
                {moderatingListingId !== null ? (
                  <ActivityIndicator size="small" color={colours.textInverse} />
                ) : (
                  <Text style={styles.modalDestructiveButtonText}>Cancel listing</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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

  title: {
    marginBottom: spacing.md,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },

  searchInput: {
    minHeight: layout.controlHeight,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
  },

  filterRow: {
    paddingBottom: spacing.lg,
    paddingRight: spacing.md,
  },

  filterChip: {
    minHeight: 34,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.sm,
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
    fontSize: fontSize.label,
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

  listingRow: {
    position: 'relative',
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  rowMain: {
    flex: 1,
    paddingRight: spacing.sm,
  },

  listingTitle: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },

  listingDonor: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  statusBadge: {
    maxWidth: '34%',
    marginRight: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius,
  },

  statusBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },

  menuButton: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuButtonText: {
    marginTop: -5,
    fontSize: 24,
    lineHeight: 28,
    color: colours.textSecondary,
  },

  listingAddress: {
    marginTop: spacing.sm,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: layout.borderWidth,
    borderTopColor: colours.border,
  },

  listingMeta: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  actionMenu: {
    position: 'absolute',
    top: 46,
    right: spacing.sm,
    minWidth: 150,
    zIndex: 20,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  actionMenuItem: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },

  actionMenuItemPressed: {
    opacity: 0.7,
  },

  destructiveMenuText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.critical,
  },

  unavailableMenuText: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  infoMark: {
    width: 22,
    height: 22,
    marginRight: spacing.sm,
    textAlign: 'center',
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    lineHeight: 22,
    color: colours.textInverse,
    backgroundColor: colours.accent,
    borderRadius: 11,
  },

  infoText: {
    flex: 1,
    fontSize: fontSize.label,
    lineHeight: 18,
    color: colours.textSecondary,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenPadding,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },

  modalCard: {
    padding: spacing.lg,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  modalIcon: {
    width: 42,
    height: 42,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderRadius: 21,
    backgroundColor: '#FEE2E2',
  },

  modalIconText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colours.critical,
  },

  modalTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    textAlign: 'center',
  },

  modalDescription: {
    marginTop: spacing.sm,
    fontSize: fontSize.secondary,
    lineHeight: 21,
    color: colours.textSecondary,
    textAlign: 'center',
  },

  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },

  modalSecondaryButton: {
    flex: 1,
    minHeight: layout.controlHeight,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  modalSecondaryButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },

  modalDestructiveButton: {
    flex: 1,
    minHeight: layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    backgroundColor: colours.critical,
  },

  modalDestructiveButtonText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  buttonPressed: {
    opacity: 0.8,
  },
});
