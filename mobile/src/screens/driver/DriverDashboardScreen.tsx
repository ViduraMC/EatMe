import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { EmptyState } from '../../components';
import { getErrorMessage } from '../../api/client';
import {
  acceptAssignmentRequest,
  declineAssignmentRequest,
  fetchAssignments,
  setAvailabilityRequest,
} from '../../api/driver.api';
import { useAuth } from '../../context/AuthContext';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { ActiveDeliveryCard } from './components/ActiveDeliveryCard';
import { AvailabilityToggle } from './components/AvailabilityToggle';
import { DeclineReasonModal } from './components/DeclineReasonModal';
import { NewAssignmentCard } from './components/NewAssignmentCard';
import { StatCard, StatRow } from './components/StatCard';
import type { DriverAssignment, DriverStats } from '../../types';

/**
 * Driver dashboard. Figma frame "04 Driver Dashboard", US-DR01 and US-DR02.
 *
 * Sprint 1 shows real data from GET /driver/stats and GET /driver/assignments
 * and writes availability through PATCH /driver/availability. Sprint 2 wires
 * Accept and Decline to PUT /driver/assignments/:id/accept|decline. The
 * pickup/drop-off confirmation buttons are still drawn but inert; that is a
 * later story.
 */
export function DriverDashboardScreen() {
  const { user, updateUser } = useAuth();

  const [stats, setStats] = useState<DriverStats | null>(null);
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclineModalVisible, setIsDeclineModalVisible] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const nextAssignments = await fetchAssignments();
      setAssignments(nextAssignments);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Refetch on focus rather than on mount only, so coming back from the
  // History tab does not show a stale assignment list.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void load();
  }, [load]);

  /**
   * The switch writes to the server first and only then to the session user.
   * Nothing is stored on the device: isAvailable comes back from /auth/me on
   * the next launch, so the toggle survives a restart without a second source
   * of truth that could disagree with the database.
   */
  const onToggleAvailability = useCallback(
    async (next: boolean) => {
      setIsSavingAvailability(true);
      try {
        const payload = await setAvailabilityRequest(next);
        updateUser({ isAvailable: payload.isAvailable });
      } catch (caught) {
        Alert.alert('Could not change availability', getErrorMessage(caught));
      } finally {
        setIsSavingAvailability(false);
      }
    },
    [updateUser],
  );

  const newAssignment = assignments.find((item) => item.status === 'pending_driver');
  const activeDelivery = assignments.find(
    (item) => item.status === 'accepted' || item.status === 'in_transit',
  );

  /** Swaps one assignment in place so the list re-renders without a refetch. */
  const replaceAssignment = useCallback((updated: DriverAssignment) => {
    setAssignments((current) =>
      current.map((item) =>
        item.assignmentId === updated.assignmentId ? updated : item,
      ),
    );
  }, []);

  const onAccept = useCallback(async () => {
    if (!newAssignment) {
      return;
    }
    setIsAccepting(true);
    try {
      const updated = await acceptAssignmentRequest(newAssignment.assignmentId);
      replaceAssignment(updated);
    } catch (caught) {
      Alert.alert('Could not accept assignment', getErrorMessage(caught));
    } finally {
      setIsAccepting(false);
    }
  }, [newAssignment, replaceAssignment]);

  const onDeclinePress = useCallback(() => {
    setDeclineError(null);
    setIsDeclineModalVisible(true);
  }, []);

  const onDeclineCancel = useCallback(() => {
    setIsDeclineModalVisible(false);
    setDeclineError(null);
  }, []);

  const onDeclineSubmit = useCallback(
    async (declineReason: string) => {
      if (!newAssignment) {
        return;
      }
      setIsDeclining(true);
      setDeclineError(null);
      try {
        const updated = await declineAssignmentRequest(
          newAssignment.assignmentId,
          declineReason,
        );
        replaceAssignment(updated);
        setIsDeclineModalVisible(false);
      } catch (caught) {
        setDeclineError(getErrorMessage(caught));
      } finally {
        setIsDeclining(false);
      }
    },
    [newAssignment, replaceAssignment],
  );

  // TODO(US-DR03): wire to the pickup/drop-off confirmation flow.
  const onConfirmDelivery = useCallback(() => {
    Alert.alert('Coming soon', 'Pickup and drop-off confirmation is not built yet.');
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centre} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={colours.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colours.accent}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name ?? 'Driver'}
            </Text>
            <Text style={styles.role}>
              {user?.organisationName ? `${user.organisationName} - Driver` : 'Driver'}
            </Text>
          </View>
          <AvailabilityToggle
            isAvailable={user?.isAvailable ?? false}
            onChange={onToggleAvailability}
            isSaving={isSavingAvailability}
          />
        </View>

        <StatRow>
          <StatCard value={stats?.deliveriesToday ?? 0} label="Deliveries today" />
          <StatCard value={stats?.completedThisWeek ?? 0} label="Completed this week" />
        </StatRow>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.sectionHeading}>New assignment</Text>
        {newAssignment ? (
          <NewAssignmentCard
            assignment={newAssignment}
            onAccept={onAccept}
            onDecline={onDeclinePress}
            isAccepting={isAccepting}
            isDeclining={isDeclining}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {user?.isAvailable
                ? 'Nothing waiting on you right now.'
                : 'You are marked unavailable, so no new assignments will come through.'}
            </Text>
          </View>
        )}

        <Text style={styles.sectionHeading}>Active delivery</Text>
        {activeDelivery ? (
          <ActiveDeliveryCard assignment={activeDelivery} onConfirm={onConfirmDelivery} />
        ) : (
          <EmptyState
            title="No active delivery"
            message="An assignment you accept will show its progress here."
          />
        )}
      </ScrollView>

      <DeclineReasonModal
        visible={isDeclineModalVisible}
        isSubmitting={isDeclining}
        errorMessage={declineError}
        onCancel={onDeclineCancel}
        onSubmit={onDeclineSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colours.background },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.background,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.screenPadding,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  identity: { flex: 1 },
  name: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  role: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    marginBottom: spacing.md,
  },
  placeholder: {
    backgroundColor: colours.surface,
    borderRadius: layout.radius,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  placeholderText: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    lineHeight: 20,
  },
  error: {
    fontSize: fontSize.secondary,
    color: colours.critical,
    marginBottom: spacing.md,
  },
});
