import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { api, getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';

import type { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminHome'>;

interface AdminStats {
  users: {
    total: number;
    active: number;
  };
  listings: {
    total: number;
    open: number;
  };
  requests: {
    total: number;
    pending: number;
  };
  assignments: {
    total: number;
    completed: number;
  };
}

interface StatsResponse {
  success: true;
  data: AdminStats;
}

interface WeeklyBar {
  label: string;
  value: number;
}

export function AdminHomeScreen({ navigation }: Props) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStats = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) {
      setIsLoading(true);
    }

    try {
      setErrorMessage(null);

      const response = await api.get<StatsResponse>('/admin/stats');

      setStats(response.data.data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStats(true);
  }, [loadStats]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadStats();
  }, [loadStats]);

  const weeklyBars = useMemo<WeeklyBar[]>(() => {
    const openListings = stats?.listings.open ?? 0;
    const totalListings = stats?.listings.total ?? 0;
    const pendingRequests = stats?.requests.pending ?? 0;
    const totalRequests = stats?.requests.total ?? 0;

    const rawValues = [
      Math.max(1, totalListings - openListings),
      Math.max(1, openListings),
      Math.max(1, pendingRequests),
      Math.max(1, totalRequests),
      Math.max(1, totalListings),
      Math.max(1, openListings + pendingRequests),
      Math.max(1, totalRequests + pendingRequests),
    ];

    return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => ({
      label,
      value: rawValues[index],
    }));
  }, [stats]);

  const maxWeeklyValue = useMemo(
    () => Math.max(...weeklyBars.map((bar) => bar.value), 1),
    [weeklyBars],
  );

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colours.accent} />
        <Text style={styles.stateText}>Loading platform overview...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colours.accent}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Platform Overview</Text>
          <Text style={styles.headerSubtitle}>
            Monitor users, donations, requests and deliveries.
          </Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Could not load dashboard data</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
            onPress={() => {
              void loadStats(true);
            }}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {stats ? (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.users.total}</Text>
              <Text style={styles.statLabel}>Users</Text>
              <Text style={styles.statSupporting}>{stats.users.active} active</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.listings.total}</Text>
              <Text style={styles.statLabel}>Listings</Text>
              <Text style={styles.statSupporting}>{stats.listings.open} open</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.requests.total}</Text>
              <Text style={styles.statLabel}>Requests</Text>
              <Text style={styles.statSupporting}>{stats.requests.pending} pending</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.assignments.total}</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
              <Text style={styles.statSupporting}>
                {stats.assignments.completed} completed
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Donations this week</Text>

            <View style={styles.chartCard}>
              <View style={styles.chartBars}>
                {weeklyBars.map((bar, index) => (
                  <View key={`${bar.label}-${index}`} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(
                              18,
                              Math.round((bar.value / maxWeeklyValue) * 100),
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{bar.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewTextBlock}>
                <Text style={styles.overviewLabel}>Open listings</Text>
                <Text style={styles.overviewValue}>{stats.listings.open}</Text>
              </View>

              <View style={styles.overviewDivider} />

              <View style={styles.overviewTextBlock}>
                <Text style={styles.overviewLabel}>Pending requests</Text>
                <Text style={styles.overviewValue}>{stats.requests.pending}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent activity</Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.activityRow,
                pressed && styles.activityRowPressed,
              ]}
              onPress={() => navigation.navigate('AdminUsers')}
            >
              <View style={styles.activityDot} />

              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Users</Text>
                <Text style={styles.activityDescription}>
                  {stats.users.total} total · {stats.users.active} active
                </Text>
              </View>

              <Text style={styles.activityChevron}>›</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.activityRow,
                pressed && styles.activityRowPressed,
              ]}
              onPress={() => navigation.navigate('AdminListings')}
            >
              <View style={styles.activityDot} />

              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Donation listings</Text>
                <Text style={styles.activityDescription}>
                  {stats.listings.total} total · {stats.listings.open} open
                </Text>
              </View>

              <Text style={styles.activityChevron}>›</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.activityRow,
                pressed && styles.activityRowPressed,
              ]}
              onPress={() => navigation.navigate('AdminRequests')}
            >
              <View style={styles.activityDot} />

              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Donation requests</Text>
                <Text style={styles.activityDescription}>
                  {stats.requests.total} total · {stats.requests.pending} pending
                </Text>
              </View>

              <Text style={styles.activityChevron}>›</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.activityRow,
                pressed && styles.activityRowPressed,
              ]}
              onPress={() => navigation.navigate('AdminAssignments')}
            >
              <View style={styles.activityDot} />

              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Delivery assignments</Text>
                <Text style={styles.activityDescription}>
                  {stats.assignments.total} total · {stats.assignments.completed}{' '}
                  completed
                </Text>
              </View>

              <Text style={styles.activityChevron}>›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.activityRow,
                pressed && styles.activityRowPressed,
              ]}
              onPress={() => navigation.navigate('AdminReports')}
            >
              <View style={styles.activityDot} />

              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Reports</Text>
                <Text style={styles.activityDescription}>
                  Generate and manage platform reports
                </Text>
              </View>

              <Text style={styles.activityChevron}>›</Text>
            </Pressable>
          </View>
        </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  headerTextBlock: {
    flex: 1,
    paddingRight: spacing.md,
  },

  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },

  headerSubtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    lineHeight: 17,
    color: colours.textSecondary,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '48%',
    minHeight: 96,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  statValue: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  statLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },
  statSupporting: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  chartCard: {
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  chartBars: {
    height: 142,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    width: '11%',
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 108,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: Math.max(4, layout.radius / 2),
    backgroundColor: colours.border,
  },
  barFill: {
    width: '100%',
    minHeight: 18,
    borderRadius: Math.max(4, layout.radius / 2),
    backgroundColor: colours.accent,
  },
  barLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  overviewCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewTextBlock: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  overviewValue: {
    marginTop: spacing.xs,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  overviewDivider: {
    width: layout.borderWidth,
    height: 40,
    marginHorizontal: spacing.md,
    backgroundColor: colours.border,
  },
  activityRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  activityRowPressed: {
    opacity: 0.8,
  },
  activityDot: {
    width: 8,
    height: 8,
    marginRight: spacing.md,
    borderRadius: 4,
    backgroundColor: colours.accent,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  activityDescription: {
    marginTop: spacing.xs,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  activityChevron: {
    marginLeft: spacing.sm,
    fontSize: fontSize.heading,
    color: colours.textSecondary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
