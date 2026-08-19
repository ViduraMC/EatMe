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

type AssignmentStatus =
  'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled';

interface AssignmentCoordinator {
  userId: number;
  name: string;
  email: string;
  phone: string;
}

interface AssignmentDriver {
  userId: number;
  name: string;
  email: string;
  phone: string;
  isAvailable: boolean;
  status: UserStatus;
}

interface AssignmentParty {
  userId: number;
  name: string;
  organisationName: string | null;
}

interface AssignmentListing {
  listingId: number;
  title: string;
  pickupAddress: string;
  donor: AssignmentParty;
}

interface AssignmentRequest {
  requestId: number;
  status: string;
  recipient: AssignmentParty;
  listing: AssignmentListing;
}

interface AdminAssignment {
  assignmentId: number;
  requestId: number;
  coordinatorId: number;
  driverId: number;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
  coordinator: AssignmentCoordinator;
  driver: AssignmentDriver;
  request: AssignmentRequest;
}

type AssignmentsResponse = ApiSuccess<{
  assignments: AdminAssignment[];
}>;

type StatusFilter = 'all' | AssignmentStatus;

const statusFilters: Array<{
  label: string;
  value: StatusFilter;
}> = [
  { label: 'All', value: 'all' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Picked up', value: 'picked_up' },
  { label: 'In transit', value: 'in_transit' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatStatus(status: AssignmentStatus): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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

function getStatusStyle(status: AssignmentStatus) {
  if (status === 'completed') {
    return {
      backgroundColor: '#DCFCE7',
      textColor: colours.safe,
    };
  }

  if (
    status === 'assigned' ||
    status === 'accepted' ||
    status === 'picked_up' ||
    status === 'in_transit'
  ) {
    return {
      backgroundColor: '#FEF3C7',
      textColor: colours.urgent,
    };
  }

  if (status === 'cancelled') {
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

export function AdminAssignmentsScreen() {
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAssignments = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) {
      setIsLoading(true);
    }

    try {
      setErrorMessage(null);

      const response = await api.get<AssignmentsResponse>('/admin/assignments');

      setAssignments(response.data.data.assignments);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAssignments(true);
  }, [loadAssignments]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadAssignments();
  }, [loadAssignments]);

  const filteredAssignments = useMemo(() => {
    const normalisedQuery = searchQuery.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalisedQuery) {
        return true;
      }

      const driverName = assignment.driver.name.toLowerCase();
      const coordinatorName = assignment.coordinator.name.toLowerCase();
      const listingTitle = assignment.request.listing.title.toLowerCase();
      const donorName = assignment.request.listing.donor.name.toLowerCase();
      const donorOrganisation =
        assignment.request.listing.donor.organisationName?.toLowerCase() ?? '';
      const recipientName = assignment.request.recipient.name.toLowerCase();
      const recipientOrganisation =
        assignment.request.recipient.organisationName?.toLowerCase() ?? '';

      return (
        driverName.includes(normalisedQuery) ||
        coordinatorName.includes(normalisedQuery) ||
        listingTitle.includes(normalisedQuery) ||
        donorName.includes(normalisedQuery) ||
        donorOrganisation.includes(normalisedQuery) ||
        recipientName.includes(normalisedQuery) ||
        recipientOrganisation.includes(normalisedQuery)
      );
    });
  }, [assignments, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colours.accent} />
        <Text style={styles.stateText}>Loading delivery assignments...</Text>
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
        <Text style={styles.eyebrow}>DELIVERY MONITORING</Text>
        <Text style={styles.title}>Delivery Assignments</Text>
        <Text style={styles.subtitle}>
          Monitor drivers, coordinators, requests, and delivery progress across the
          platform.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{assignments.length}</Text>
          <Text style={styles.summaryLabel}>Total assignments</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {assignments.filter((assignment) => assignment.status === 'completed').length}
          </Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.searchSection}>
        <Text style={styles.fieldLabel}>Search assignments</Text>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Driver, coordinator, donor, recipient or listing"
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
          <Text style={styles.errorTitle}>Could not load assignments</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            onPress={() => {
              void loadAssignments(true);
            }}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!errorMessage && filteredAssignments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No delivery assignments found</Text>
          <Text style={styles.emptyText}>
            There are currently no assignments matching this search or status.
          </Text>
        </View>
      ) : null}

      {filteredAssignments.map((assignment) => {
        const statusStyle = getStatusStyle(assignment.status);

        const donorDisplayName =
          assignment.request.listing.donor.organisationName ||
          assignment.request.listing.donor.name;

        const recipientDisplayName =
          assignment.request.recipient.organisationName ||
          assignment.request.recipient.name;

        return (
          <View key={assignment.assignmentId} style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <View style={styles.assignmentHeaderText}>
                <Text style={styles.assignmentTitle}>
                  {assignment.request.listing.title}
                </Text>

                <Text style={styles.assignmentId}>
                  Assignment #{assignment.assignmentId}
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
                  {formatStatus(assignment.status)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Driver</Text>
              <Text style={styles.detailValue}>{assignment.driver.name}</Text>
              <Text style={styles.detailSupporting}>{assignment.driver.email}</Text>
              <Text style={styles.detailSupporting}>{assignment.driver.phone}</Text>
              <Text style={styles.detailSupporting}>
                {assignment.driver.isAvailable ? 'Available' : 'Unavailable'}
              </Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Coordinator</Text>
              <Text style={styles.detailValue}>{assignment.coordinator.name}</Text>
              <Text style={styles.detailSupporting}>{assignment.coordinator.email}</Text>
              <Text style={styles.detailSupporting}>{assignment.coordinator.phone}</Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Donor</Text>
              <Text style={styles.detailValue}>{donorDisplayName}</Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Recipient</Text>
              <Text style={styles.detailValue}>{recipientDisplayName}</Text>
            </View>

            <View style={styles.detailGroup}>
              <Text style={styles.detailLabel}>Pickup location</Text>
              <Text style={styles.detailValue}>
                {assignment.request.listing.pickupAddress}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataValue}>#{assignment.request.requestId}</Text>
                <Text style={styles.metadataLabel}>Request</Text>
              </View>

              <View style={styles.metadataDivider} />

              <View style={styles.metadataItem}>
                <Text style={styles.metadataValue}>
                  {formatDateTime(assignment.createdAt)}
                </Text>
                <Text style={styles.metadataLabel}>Assigned</Text>
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
  assignmentCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  assignmentHeaderText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  assignmentTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  assignmentId: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  statusBadge: {
    maxWidth: '42%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius,
  },
  statusBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
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
