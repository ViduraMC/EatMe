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
  'pending_driver' | 'accepted' | 'declined' | 'in_transit' | 'completed' | 'cancelled';

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
  { label: 'Pending driver', value: 'pending_driver' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
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

function getStatusStyle(status: AssignmentStatus) {
  if (status === 'completed') {
    return {
      backgroundColor: '#DCFCE7',
      textColor: colours.safe,
    };
  }

  if (status === 'cancelled') {
    return {
      backgroundColor: '#FEE2E2',
      textColor: colours.critical,
    };
  }

  return {
    backgroundColor: '#FEF3C7',
    textColor: colours.urgent,
  };
}

function getPartyDisplayName(party: AssignmentParty): string {
  return party.organisationName || party.name;
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

      const pickupAddress = assignment.request.listing.pickupAddress.toLowerCase();

      return (
        driverName.includes(normalisedQuery) ||
        coordinatorName.includes(normalisedQuery) ||
        listingTitle.includes(normalisedQuery) ||
        donorName.includes(normalisedQuery) ||
        donorOrganisation.includes(normalisedQuery) ||
        recipientName.includes(normalisedQuery) ||
        recipientOrganisation.includes(normalisedQuery) ||
        pickupAddress.includes(normalisedQuery)
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
      <Text style={styles.title}>All Assignments</Text>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search assignments"
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
        style={styles.filterScroll}
        keyboardShouldPersistTaps="handled"
      >
        {statusFilters.map((filter) => {
          const selected = statusFilter === filter.value;

          return (
            <Pressable
              key={filter.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
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
          <Text style={styles.emptyTitle}>No assignments found</Text>

          <Text style={styles.emptyText}>
            Try another search term or change the selected status filter.
          </Text>
        </View>
      ) : null}

      {!errorMessage
        ? filteredAssignments.map((assignment) => {
            const statusStyle = getStatusStyle(assignment.status);

            const donorDisplayName = getPartyDisplayName(
              assignment.request.listing.donor,
            );

            const recipientDisplayName = getPartyDisplayName(
              assignment.request.recipient,
            );

            return (
              <View key={assignment.assignmentId} style={styles.assignmentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.assignmentTitle}>
                      {assignment.request.listing.title}
                    </Text>

                    <Text style={styles.driverName}>
                      Driver: {assignment.driver.name}
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

                <View style={styles.routeSection}>
                  <View style={styles.routeParty}>
                    <Text style={styles.routeLabel}>DONOR</Text>

                    <Text style={styles.routeValue} numberOfLines={2}>
                      {donorDisplayName}
                    </Text>
                  </View>

                  <Text style={styles.routeArrow}>→</Text>

                  <View style={styles.routeParty}>
                    <Text style={styles.routeLabel}>RECIPIENT</Text>

                    <Text style={styles.routeValue} numberOfLines={2}>
                      {recipientDisplayName}
                    </Text>
                  </View>
                </View>

                <Text style={styles.pickupAddress}>
                  {assignment.request.listing.pickupAddress}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerText}>
                    Assignment #{assignment.assignmentId}
                  </Text>

                  <Text style={styles.footerText}>
                    Request #{assignment.request.requestId}
                  </Text>
                </View>
              </View>
            );
          })
        : null}

      {!errorMessage ? (
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </View>

          <Text style={styles.infoText}>
            Delivery assignments are shown here for platform monitoring. Their progress is
            managed through the coordinator and delivery workflows.
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
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
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
    marginBottom: spacing.lg,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
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

  filterScroll: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  filterRow: {
    paddingRight: spacing.md,
  },

  filterChip: {
    minHeight: 40,
    marginRight: spacing.xs,
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

  assignmentCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  cardHeaderText: {
    flex: 1,
    paddingRight: spacing.sm,
  },

  assignmentTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },

  driverName: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },

  statusBadge: {
    flexShrink: 0,
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

  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  routeParty: {
    flex: 1,
  },

  routeLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.textSecondary,
  },

  routeValue: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },

  routeArrow: {
    marginHorizontal: spacing.sm,
    fontSize: fontSize.body,
    color: colours.textSecondary,
  },

  pickupAddress: {
    marginTop: spacing.sm,
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: layout.borderWidth,
    borderTopColor: colours.border,
  },

  footerText: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },

  emptyCard: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
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
    textAlign: 'center',
  },

  emptyText: {
    marginTop: spacing.sm,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
    textAlign: 'center',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },

  infoIcon: {
    width: 24,
    height: 24,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colours.accent,
  },

  infoIconText: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },

  infoText: {
    flex: 1,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },

  errorCard: {
    marginBottom: spacing.md,
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

  buttonPressed: {
    opacity: 0.8,
  },
});
