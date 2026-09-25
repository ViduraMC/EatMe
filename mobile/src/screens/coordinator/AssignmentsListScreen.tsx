import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card, EmptyState, ScreenContainer, StatusPill } from '../../components';
import { fetchAssignments } from '../../api/assignments.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import { formatDateTime } from '../../utils/datetime';
import type { CoordinatorAssignment, AssignmentStatus } from '../../types/assignment';
import type { CoordinatorTabProps } from '../../navigation/types';

type Props = CoordinatorTabProps<'AssignmentsList'>;

const FILTER_OPTIONS: { label: string; value?: AssignmentStatus }[] = [
  { label: 'All' },
  { label: 'Pending Driver', value: 'pending_driver' },
  { label: 'Declined', value: 'declined' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

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

export function AssignmentsListScreen({ navigation }: Props) {
  const [assignments, setAssignments] = useState<CoordinatorAssignment[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<AssignmentStatus | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      try {
        setAssignments(await fetchAssignments(selectedFilter));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedFilter],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleFilterChange = (status?: AssignmentStatus) => {
    setSelectedFilter(status);
    setLoading(true);
  };

  if (loading && !refreshing) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <Text style={styles.heading}>Assignments</Text>

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = selectedFilter === opt.value;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => handleFilterChange(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
            title="No assignments found"
            message={
              selectedFilter
                ? `No assignments with status "${statusLabel(selectedFilter)}".`
                : 'Once you assign a driver to a request, it will appear here.'
            }
          />
        }
        renderItem={({ item }) => {
          const needsAttention =
            item.status === 'declined' || item.status === 'pending_driver';

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('AssignmentDetail', {
                  assignmentId: item.assignmentId,
                })
              }
            >
              <Card
                style={[
                  styles.card,
                  item.status === 'declined' && styles.cardDeclined,
                  item.status === 'pending_driver' && styles.cardPending,
                ]}
              >
                {needsAttention && (
                  <View style={styles.attentionBanner}>
                    <Text style={styles.attentionText}>
                      {item.status === 'declined'
                        ? '⚠️ Driver declined - Action required'
                        : '⏳ Awaiting driver confirmation'}
                    </Text>
                  </View>
                )}

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

                {item.declineReason && (
                  <Text style={styles.declineReason} numberOfLines={2}>
                    Decline Reason: "{item.declineReason}"
                  </Text>
                )}

                {item.noteToDriver ? (
                  <Text style={styles.note} numberOfLines={1}>
                    Note: {item.noteToDriver}
                  </Text>
                ) : null}

                <Text style={styles.tapPrompt}>Tap to view details & timeline →</Text>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    marginBottom: spacing.xs,
  },
  filterWrapper: {
    marginBottom: spacing.sm,
  },
  filterScroll: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },
  chipActive: {
    backgroundColor: colours.accent,
    borderColor: colours.accent,
  },
  chipText: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    fontWeight: fontWeight.medium,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: fontWeight.semibold,
  },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  card: {
    marginBottom: spacing.sm,
  },
  cardDeclined: {
    borderColor: colours.critical,
    borderWidth: 1.5,
    backgroundColor: '#FFF8F8',
  },
  cardPending: {
    borderColor: colours.urgent,
    borderWidth: 1.5,
  },
  attentionBanner: {
    marginBottom: spacing.xs,
    paddingVertical: 2,
  },
  attentionText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.critical,
  },
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
  declineReason: {
    fontSize: fontSize.secondary,
    color: colours.critical,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  note: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  tapPrompt: {
    fontSize: fontSize.label,
    color: colours.accent,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});
