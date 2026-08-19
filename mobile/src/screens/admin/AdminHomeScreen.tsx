import React, { useCallback, useEffect, useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';

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

export function AdminHomeScreen({ navigation }: Props) {
  const { user } = useAuth();

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

  if (isLoading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={colours.accent} />
        <Text style={styles.stateText}>Loading administration overview...</Text>
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
        <Text style={styles.eyebrow}>ADMIN OVERVIEW</Text>

        <Text style={styles.title}>Welcome{user?.name ? `, ${user.name}` : ''}</Text>

        <Text style={styles.subtitle}>
          Monitor activity across EatMe and keep an eye on the platform at a glance.
        </Text>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Platform statistics</Text>
            <Text style={styles.sectionDescription}>
              Current totals from the EatMe platform.
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Users</Text>
              <Text style={styles.statValue}>{stats.users.total}</Text>
              <Text style={styles.statSupporting}>{stats.users.active} active</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Listings</Text>
              <Text style={styles.statValue}>{stats.listings.total}</Text>
              <Text style={styles.statSupporting}>{stats.listings.open} open</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Requests</Text>
              <Text style={styles.statValue}>{stats.requests.total}</Text>
              <Text style={styles.statSupporting}>{stats.requests.pending} pending</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Deliveries</Text>
              <Text style={styles.statValue}>{stats.assignments.total}</Text>
              <Text style={styles.statSupporting}>
                {stats.assignments.completed} completed
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Platform activity</Text>
            <Text style={styles.sectionDescription}>
              Quick access to the areas you need to monitor.
            </Text>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityText}>
              <Text style={styles.activityTitle}>Donation listings</Text>
              <Text style={styles.activityDescription}>
                Review all donor listings and their current statuses.
              </Text>
            </View>

            <View style={styles.activitySummary}>
              <Text style={styles.activityNumber}>{stats.listings.total}</Text>
              <Text style={styles.activitySummaryLabel}>total</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate('AdminListings')}
            >
              <Text style={styles.primaryButtonText}>View listings</Text>
            </Pressable>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityText}>
              <Text style={styles.activityTitle}>Donation requests</Text>
              <Text style={styles.activityDescription}>
                Track recipient requests and pending activity.
              </Text>
            </View>

            <View style={styles.activitySummary}>
              <Text style={styles.activityNumber}>{stats.requests.total}</Text>
              <Text style={styles.activitySummaryLabel}>
                {stats.requests.pending} pending
              </Text>
            </View>

            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Monitoring available</Text>
            </View>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityText}>
              <Text style={styles.activityTitle}>Delivery assignments</Text>
              <Text style={styles.activityDescription}>
                Monitor delivery progress across the platform.
              </Text>
            </View>

            <View style={styles.activitySummary}>
              <Text style={styles.activityNumber}>{stats.assignments.total}</Text>
              <Text style={styles.activitySummaryLabel}>
                {stats.assignments.completed} completed
              </Text>
            </View>

            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Monitoring available</Text>
            </View>
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
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  sectionDescription: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  statCard: {
    width: '48%',
    minHeight: 128,
    marginBottom: spacing.md,
    padding: spacing.md,
    justifyContent: 'space-between',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  statLabel: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
  },
  statValue: {
    marginVertical: spacing.sm,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  statSupporting: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.accent,
  },
  activityCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    backgroundColor: colours.background,
  },
  activityText: {
    marginBottom: spacing.md,
  },
  activityTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  activityDescription: {
    marginTop: spacing.xs,
    fontSize: fontSize.secondary,
    lineHeight: 20,
    color: colours.textSecondary,
  },
  activitySummary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  activityNumber: {
    marginRight: spacing.sm,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  activitySummaryLabel: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
  },
  primaryButton: {
    minHeight: layout.controlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.radius,
    backgroundColor: colours.accent,
  },
  primaryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textInverse,
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: layout.radius,
    backgroundColor: colours.surface,
  },
  pendingBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.textSecondary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
