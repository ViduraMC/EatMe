import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, EmptyState, ScreenContainer, StatusPill } from '../../components';
import { fetchAssignmentQueue, fetchCoordinatorStats } from '../../api/assignments.api';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime, formatTimeUntil } from '../../utils/datetime';
import type { AssignmentQueueRequest, CoordinatorStats } from '../../types/assignment';
import type { CoordinatorStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<
  CoordinatorStackParamList,
  'CoordinatorHome'
>;

export function CoordinatorHomeScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [stats, setStats] = useState<CoordinatorStats | null>(null);
  const [queue, setQueue] = useState<AssignmentQueueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Signed in as {user?.name}</Text>
          <Text style={styles.roleLabel}>Delivery Coordinator</Text>
        </View>
        <Button
          label="Log Out"
          variant="secondary"
          onPress={() => void logout()}
          style={styles.logout}
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* KPI Stats Grid */}
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
          <Text style={styles.statLabel}>In Transit / Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.completedDeliveryCount ?? 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Delivery Queue</Text>
        <Button
          label="View Drivers"
          variant="secondary"
          onPress={() => navigation.navigate('DriversList')}
          style={styles.driversButton}
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
          // Worst urgency is decided by request items
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

          return (
            <Card style={styles.requestCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {item.listing.title}
                </Text>
                <StatusPill label="Awaiting Assignment" tone={worstLevel} />
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>Donor:</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {item.listing.donor.organisationName ?? item.listing.donor.name}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>Recipient:</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {item.recipient.organisationName ?? item.recipient.name}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>Items:</Text>
                <Text style={styles.value}>
                  {item.items
                    .map(
                      (ri) =>
                        `${ri.item.foodName} (${ri.quantityRequested} ${ri.item.unit})`,
                    )
                    .join(', ')}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.label}>Pickup:</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {formatDateTime(item.listing.pickupWindowStart)} -{' '}
                  {formatDateTime(item.listing.pickupWindowEnd)}
                </Text>
              </View>

              {soonestItemExpiry && (
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Soonest Expiry:</Text>
                  <Text
                    style={[
                      styles.value,
                      worstLevel === 'critical' && styles.criticalText,
                    ]}
                  >
                    {formatTimeUntil(soonestItemExpiry)}
                  </Text>
                </View>
              )}

              {/* Assignment actions will be built in Sprint 2 / C02. For foundation, we just show the card. */}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerText: { flexShrink: 1 },
  greeting: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  roleLabel: { fontSize: fontSize.secondary, color: colours.textSecondary },
  logout: { paddingHorizontal: spacing.md, height: 36 },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  driversButton: { height: 36, paddingHorizontal: spacing.md },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  requestCard: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  listingTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    width: 100,
  },
  value: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    flex: 1,
  },
  criticalText: {
    color: colours.critical,
    fontWeight: fontWeight.semibold,
  },
});
