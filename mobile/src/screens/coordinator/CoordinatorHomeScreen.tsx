import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, EmptyState, ScreenContainer, StatusPill } from '../../components';
import {
  fetchAssignmentQueue,
  fetchCoordinatorStats,
  rejectRequest,
} from '../../api/assignments.api';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime, formatTimeUntil } from '../../utils/datetime';
import type { AssignmentQueueRequest, CoordinatorStats } from '../../types/assignment';
import type { CoordinatorTabProps } from '../../navigation/types';

type NavigationProp = CoordinatorTabProps<'CoordinatorHome'>['navigation'];

export function CoordinatorHomeScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [stats, setStats] = useState<CoordinatorStats | null>(null);
  const [queue, setQueue] = useState<AssignmentQueueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [fetchedStats, fetchedQueue] = await Promise.all([
        fetchCoordinatorStats(),
        fetchAssignmentQueue(),
      ]);
      setStats(fetchedStats);
      setQueue(fetchedQueue);
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

  const handleReject = useCallback(
    (requestId: number, listingTitle: string) => {
      Alert.prompt(
        'Reject Request',
        `Reject request for "${listingTitle}"?\nOptionally enter a reason:`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async (reason?: string) => {
              setRejectingId(requestId);
              try {
                await rejectRequest(requestId, {
                  rejectionReason: reason?.trim() || null,
                });
                await load();
              } catch (err) {
                Alert.alert('Error', getErrorMessage(err));
              } finally {
                setRejectingId(null);
              }
            },
          },
        ],
        'plain-text',
      );
    },
    [load],
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Coordinator Dashboard</Text>
          <Text style={styles.subtitle}>
            {queue.length === 0
              ? 'No pending deliveries'
              : `${queue.length} request${queue.length === 1 ? '' : 's'} awaiting assignment`}
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

      {/* KPI Stats Summary Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.queueSize ?? 0}</Text>
          <Text style={styles.statLabel}>Awaiting Assignment</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.pendingDriverCount ?? 0}</Text>
          <Text style={styles.statLabel}>Awaiting Driver</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.activeDeliveryCount ?? 0}</Text>
          <Text style={styles.statLabel}>In Transit</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.completedDeliveryCount ?? 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Full width green Drivers List button under cards */}
      <Button
        label="Drivers List"
        variant="primary"
        onPress={() => navigation.navigate('DriversList')}
        style={styles.fullWidthButton}
      />

      {/* Section header row */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Delivery Queue</Text>
        <Button
          label="All Assignments"
          variant="secondary"
          onPress={() => navigation.navigate('AssignmentsList')}
          style={styles.assignmentsButton}
        />
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => String(item.requestId)}
        refreshing={refreshing}
        onRefresh={() => void load(true)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={queue.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={
          <EmptyState
            title="Queue is empty"
            message="No accepted requests are waiting for delivery assignment right now."
          />
        }
        renderItem={({ item }) => {
          const worstLevel = item.items.some((i) => i.item.urgencyLevel === 'critical')
            ? 'critical'
            : item.items.some((i) => i.item.urgencyLevel === 'urgent')
              ? 'urgent'
              : 'safe';

          const soonestItemExpiry =
            item.items
              .map((i) => i.item.effectiveExpiry)
              .filter((d): d is string => !!d)
              .sort()[0] ?? null;

          const isRejecting = rejectingId === item.requestId;

          return (
            <Card>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.listing.title}
                </Text>
                <StatusPill label="Awaiting Assignment" tone={worstLevel} />
              </View>

              <Text style={styles.cardMeta} numberOfLines={1}>
                Donor: {item.listing.donor.organisationName ?? item.listing.donor.name}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                Recipient: {item.recipient.organisationName ?? item.recipient.name}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={2}>
                Items:{' '}
                {item.items
                  .map(
                    (ri) =>
                      `${ri.item.foodName} (${ri.quantityRequested} ${ri.item.unit})`,
                  )
                  .join(', ')}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                Pickup: {formatDateTime(item.listing.pickupWindowStart)}
              </Text>
              {soonestItemExpiry && (
                <Text style={styles.cardMeta}>
                  Expires: {formatTimeUntil(soonestItemExpiry)}
                </Text>
              )}

              {/* US-C02 action buttons */}
              <View style={styles.cardActions}>
                <Button
                  label="Assign Driver"
                  variant="primary"
                  onPress={() =>
                    navigation.navigate('CreateAssignment', {
                      requestId: item.requestId,
                    })
                  }
                  style={styles.assignButton}
                />
                <Button
                  label={isRejecting ? 'Rejecting…' : 'Reject'}
                  variant="secondary"
                  onPress={() => handleReject(item.requestId, item.listing.title)}
                  style={styles.rejectButton}
                />
              </View>
            </Card>
          );
        }}
      />
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

  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: colours.surface,
    borderRadius: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colours.border,
  },
  statNumber: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  fullWidthButton: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  assignmentsButton: {
    height: 36,
    paddingHorizontal: spacing.md,
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
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  assignButton: { flex: 1 },
  rejectButton: { flex: 1 },
});
