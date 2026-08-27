import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Card, EmptyState, ScreenContainer, StatusPill } from '../../components';
import { fetchAssignments } from '../../api/assignments.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime } from '../../utils/datetime';
import type { CoordinatorAssignment, AssignmentStatus } from '../../types/assignment';

/** Maps assignment status to a StatusPill tone. */
function statusTone(
  status: AssignmentStatus,
): 'safe' | 'urgent' | 'critical' | 'neutral' {
  switch (status) {
    case 'pending_driver':
      return 'urgent';
    case 'accepted':
    case 'in_transit':
      return 'safe';
    case 'completed':
      return 'neutral';
    case 'declined':
    case 'cancelled':
      return 'critical';
    default:
      return 'neutral';
  }
}

/** Human-readable status label. */
function statusLabel(status: AssignmentStatus): string {
  switch (status) {
    case 'pending_driver':
      return 'Awaiting Driver';
    case 'accepted':
      return 'Driver Accepted';
    case 'in_transit':
      return 'In Transit';
    case 'completed':
      return 'Completed';
    case 'declined':
      return 'Driver Declined';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function AssignmentsListScreen() {
  const [assignments, setAssignments] = useState<CoordinatorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setAssignments(await fetchAssignments());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      <Text style={styles.heading}>
        {assignments.length === 0
          ? 'No assignments yet'
          : `${assignments.length} assignment${assignments.length === 1 ? '' : 's'}`}
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={assignments}
        keyExtractor={(item) => String(item.assignmentId)}
        refreshing={refreshing}
        onRefresh={() => void load(true)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={assignments.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={
          <EmptyState
            title="No assignments yet"
            message="Once you assign a driver to a request, it will appear here."
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.request.listing.title}
              </Text>
              <StatusPill
                label={statusLabel(item.status)}
                tone={statusTone(item.status)}
              />
            </View>

            <Text style={styles.cardMeta} numberOfLines={1}>
              Driver: {item.driver.name}{' '}
              {item.driver.isAvailable ? '(Available)' : '(Busy)'}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              Recipient:{' '}
              {item.request.recipient.organisationName ?? item.request.recipient.name}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              Donor:{' '}
              {item.request.listing.donor.organisationName ??
                item.request.listing.donor.name}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              Pickup: {formatDateTime(item.request.listing.pickupWindowStart)}
            </Text>
            {item.noteToDriver ? (
              <Text style={styles.note}>Note: {item.noteToDriver}</Text>
            ) : null}

            {/* Confirmation timestamps */}
            {item.pickupDonorConfirmedAt && (
              <Text style={styles.timestamp}>
                ✓ Donor confirmed pickup {formatDateTime(item.pickupDonorConfirmedAt)}
              </Text>
            )}
            {item.pickupDriverConfirmedAt && (
              <Text style={styles.timestamp}>
                ✓ Driver confirmed pickup {formatDateTime(item.pickupDriverConfirmedAt)}
              </Text>
            )}
            {item.completedAt && (
              <Text style={styles.timestamp}>
                ✓ Completed {formatDateTime(item.completedAt)}
              </Text>
            )}
          </Card>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    marginBottom: spacing.sm,
  },
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
  note: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  timestamp: {
    fontSize: fontSize.label,
    color: colours.safe,
    marginTop: spacing.xs,
  },
});
