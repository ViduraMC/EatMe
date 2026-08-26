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

type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

interface AdminRequestRecipient {
  userId: number;
  name: string;
  email: string;
  phone: string;
  organisationName: string | null;
  status: UserStatus;
}

interface AdminRequestDonor {
  userId: number;
  name: string;
  organisationName: string | null;
}

interface AdminRequestListing {
  listingId: number;
  title: string;
  status: string;
  pickupAddress: string;
  donor: AdminRequestDonor;
}

interface AdminRequestItem {
  requestItemId: number;
  requestId: number;
  itemId: number;
  quantityRequested: string;
  item: {
    itemId: number;
    foodName: string;
    unit: string;
  };
}

interface AdminRequest {
  requestId: number;
  listingId: number;
  recipientId: number;
  message: string | null;
  status: RequestStatus;
  rejectionReason: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipient: AdminRequestRecipient;
  listing: AdminRequestListing;
  items: AdminRequestItem[];
  _count: {
    assignments: number;
  };
}

type RequestsResponse = ApiSuccess<{
  requests: AdminRequest[];
}>;

type StatusFilter = 'all' | RequestStatus;

const statusFilters: Array<{
  label: string;
  value: StatusFilter;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatStatus(status: RequestStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusStyle(status: RequestStatus) {
  if (status === 'accepted') {
    return {
      backgroundColor: '#DCFCE7',
      textColor: colours.safe,
    };
  }

  if (status === 'pending') {
    return {
      backgroundColor: '#FEF3C7',
      textColor: colours.urgent,
    };
  }

  if (status === 'rejected' || status === 'cancelled') {
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

export function AdminRequestsScreen() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) {
      setIsLoading(true);
    }

    try {
      setErrorMessage(null);

      const response = await api.get<RequestsResponse>('/admin/requests');

      setRequests(response.data.data.requests);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests(true);
  }, [loadRequests]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const normalisedQuery = searchQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalisedQuery) {
        return true;
      }

      const recipientName = request.recipient.name.toLowerCase();
      const recipientOrganisation =
        request.recipient.organisationName?.toLowerCase() ?? '';
      const listingTitle = request.listing.title.toLowerCase();
      const donorName = request.listing.donor.name.toLowerCase();
      const donorOrganisation =
        request.listing.donor.organisationName?.toLowerCase() ?? '';
      const pickupAddress = request.listing.pickupAddress.toLowerCase();

      return (
        recipientName.includes(normalisedQuery) ||
        recipientOrganisation.includes(normalisedQuery) ||
        listingTitle.includes(normalisedQuery) ||
        donorName.includes(normalisedQuery) ||
        donorOrganisation.includes(normalisedQuery) ||
        pickupAddress.includes(normalisedQuery)
      );
    });
  }, [requests, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colours.accent} />
        <Text style={styles.stateText}>Loading donation requests...</Text>
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
      <Text style={styles.title}>All Requests</Text>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search requests"
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
              onPress={() => setStatusFilter(filter.value)}
              style={({ pressed }) => [
                styles.filterChip,
                selected && styles.filterChipSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[styles.filterChipText, selected && styles.filterChipTextSelected]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not load requests</Text>

          <Text style={styles.errorMessage}>{errorMessage}</Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            onPress={() => {
              void loadRequests(true);
            }}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!errorMessage && filteredRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No requests found</Text>

          <Text style={styles.emptyText}>
            Try another search term or change the selected status filter.
          </Text>
        </View>
      ) : null}

      {!errorMessage
        ? filteredRequests.map((request) => {
            const statusStyle = getStatusStyle(request.status);

            const recipientDisplayName =
              request.recipient.organisationName || request.recipient.name;

            const donorDisplayName =
              request.listing.donor.organisationName || request.listing.donor.name;

            const itemCount = request.items.length;

            return (
              <View key={request.requestId} style={styles.requestRow}>
                <View style={styles.rowTop}>
                  <View style={styles.rowMain}>
                    <Text style={styles.requestTitle} numberOfLines={2}>
                      {request.listing.title}
                    </Text>

                    <Text style={styles.recipientName} numberOfLines={1}>
                      {recipientDisplayName}
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
                      {formatStatus(request.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.donorText} numberOfLines={1}>
                  Donor: {donorDisplayName}
                </Text>

                <Text style={styles.pickupAddress} numberOfLines={1}>
                  {request.listing.pickupAddress}
                </Text>

                {request.items.length > 0 ? (
                  <View style={styles.itemsSection}>
                    {request.items.slice(0, 2).map((requestItem) => (
                      <Text
                        key={requestItem.requestItemId}
                        style={styles.itemText}
                        numberOfLines={1}
                      >
                        {requestItem.item.foodName} · {requestItem.quantityRequested}{' '}
                        {requestItem.item.unit}
                      </Text>
                    ))}

                    {request.items.length > 2 ? (
                      <Text style={styles.moreItemsText}>
                        +{request.items.length - 2} more{' '}
                        {request.items.length - 2 === 1 ? 'item' : 'items'}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {request.status === 'rejected' && request.rejectionReason ? (
                  <View style={styles.rejectionNote}>
                    <Text style={styles.rejectionText} numberOfLines={2}>
                      {request.rejectionReason}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.rowFooter}>
                  <Text style={styles.requestMeta}>Request #{request.requestId}</Text>

                  <Text style={styles.requestMeta}>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </Text>

                  <Text style={styles.requestMeta}>
                    {request._count.assignments}{' '}
                    {request._count.assignments === 1 ? 'assignment' : 'assignments'}
                  </Text>
                </View>
              </View>
            );
          })
        : null}

      {!errorMessage && requests.length > 0 ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoMark}>i</Text>

          <Text style={styles.infoText}>
            Requests are shown here for platform monitoring. Their status is managed
            through the appropriate donor and delivery workflows.
          </Text>
        </View>
      ) : null}
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

  requestRow: {
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

  requestTitle: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },

  recipientName: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  statusBadge: {
    maxWidth: '34%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius,
  },

  statusBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },

  donorText: {
    marginTop: spacing.sm,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  pickupAddress: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  itemsSection: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  itemText: {
    fontSize: fontSize.label,
    color: colours.textPrimary,
  },

  moreItemsText: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  rejectionNote: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: layout.radius,
    backgroundColor: '#FEE2E2',
  },

  rejectionText: {
    fontSize: fontSize.label,
    lineHeight: 18,
    color: colours.critical,
  },

  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: layout.borderWidth,
    borderTopColor: colours.border,
  },

  requestMeta: {
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

  buttonPressed: {
    opacity: 0.8,
  },
});
