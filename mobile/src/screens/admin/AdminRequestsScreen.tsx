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

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Not yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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

      return (
        recipientName.includes(normalisedQuery) ||
        recipientOrganisation.includes(normalisedQuery) ||
        listingTitle.includes(normalisedQuery) ||
        donorName.includes(normalisedQuery) ||
        donorOrganisation.includes(normalisedQuery)
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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>REQUEST MONITORING</Text>
        <Text style={styles.title}>Donation Requests</Text>
        <Text style={styles.subtitle}>
          Review recipient requests, requested food, and current request status.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{requests.length}</Text>
          <Text style={styles.summaryLabel}>Total requests</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {requests.filter((request) => request.status === 'pending').length}
          </Text>
          <Text style={styles.summaryLabel}>Pending requests</Text>
        </View>
      </View>

      <View style={styles.searchSection}>
        <Text style={styles.fieldLabel}>Search requests</Text>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Recipient, donor, organisation or listing"
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

      {filteredRequests.map((request) => {
        const statusStyle = getStatusStyle(request.status);
        const recipientDisplayName =
          request.recipient.organisationName || request.recipient.name;
        const donorDisplayName =
          request.listing.donor.organisationName || request.listing.donor.name;

        return (
          <View key={request.requestId} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestHeaderText}>
                <Text style={styles.requestTitle}>{request.listing.title}</Text>

                <Text style={styles.requestId}>Request #{request.requestId}</Text>
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

            {request.message ? (
              <Text style={styles.message}>"{request.message}"</Text>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Recipient</Text>
              <Text style={styles.detailValue}>{recipientDisplayName}</Text>

              {request.recipient.organisationName ? (
                <Text style={styles.detailSupporting}>
                  Contact: {request.recipient.name}
                </Text>
              ) : null}

              <Text style={styles.detailSupporting}>{request.recipient.email}</Text>

              <Text style={styles.detailSupporting}>{request.recipient.phone}</Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Donor</Text>
              <Text style={styles.detailValue}>{donorDisplayName}</Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Pickup location</Text>
              <Text style={styles.detailValue}>{request.listing.pickupAddress}</Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Requested items</Text>

              {request.items.map((requestItem) => (
                <Text key={requestItem.requestItemId} style={styles.itemText}>
                  {requestItem.item.foodName} — {requestItem.quantityRequested}{' '}
                  {requestItem.item.unit}
                </Text>
              ))}
            </View>

            {request.rejectionReason ? (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionLabel}>Rejection reason</Text>
                <Text style={styles.rejectionText}>{request.rejectionReason}</Text>
              </View>
            ) : null}

            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataValue}>{request._count.assignments}</Text>
                <Text style={styles.metadataLabel}>Assignments</Text>
              </View>

              <View style={styles.metadataDivider} />

              <View style={styles.metadataItem}>
                <Text style={styles.metadataValue}>
                  {formatDateTime(request.respondedAt)}
                </Text>
                <Text style={styles.metadataLabel}>Responded</Text>
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
  requestCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  requestHeaderText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  requestTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  requestId: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  statusBadge: {
    maxWidth: '40%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius,
  },
  statusBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.md,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
    fontStyle: 'italic',
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
  itemText: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
  },
  rejectionBox: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: layout.radius,
    backgroundColor: '#FEE2E2',
  },
  rejectionLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.critical,
    textTransform: 'uppercase',
  },
  rejectionText: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textPrimary,
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
