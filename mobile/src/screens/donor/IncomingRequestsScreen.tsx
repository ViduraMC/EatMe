import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card, EmptyState, ScreenContainer, StatusPill } from '../../components';
import { fetchIncomingRequests } from '../../api/donations.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { formatDateTime, formatStatus } from '../../utils/datetime';
import type { IncomingRequest, RequestStatus } from '../../types/assignment';
import type { DonorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DonorStackParamList, 'IncomingRequests'>;

type Filter = 'all' | RequestStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

/** Neutral for everything except accepted, which is the good outcome. */
function toneFor(status: RequestStatus): 'safe' | 'neutral' {
  return status === 'accepted' ? 'safe' : 'neutral';
}

/** "3 hours ago", so a donor can see how long someone has been waiting. */
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return 'just now';

  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Incoming Requests, READ ONLY. Figma frame "08 Incoming Requests", minus the
 * Accept and Reject buttons.
 *
 * Sprint 2 design decision: approving a request moved to the Donation
 * Coordinator, who already owns matching and assignment. The donor persona is
 * someone with two minutes between classes, so once the food is posted their
 * active work is finished apart from confirming handover.
 *
 * There are deliberately no action buttons on this screen, and no accept or
 * reject function in donations.api.ts to call. Do not add them here.
 */
export function IncomingRequestsScreen({ navigation }: Props) {
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (current: Filter, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setRequests(await fetchIncomingRequests(current === 'all' ? undefined : current));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(filter);
    }, [load, filter]),
  );

  function changeFilter(next: Filter) {
    setFilter(next);
    setLoading(true);
    void load(next);
  }

  return (
    <ScreenContainer>
      <Text style={styles.heading}>Incoming requests</Text>

      {/*
        The one line that explains why there is nothing to tap. Without it the
        screen reads as broken rather than deliberately read only.
      */}
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          The Donation Coordinator reviews and approves these requests. You do not need to
          do anything here.
        </Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => changeFilter(f.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: filter === f.value }}
            style={[styles.chip, filter === f.value && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextOn]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => String(r.requestId)}
          refreshing={refreshing}
          onRefresh={() => void load(filter, true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={requests.length === 0 ? styles.emptyWrap : undefined}
          ListEmptyComponent={
            <EmptyState
              title={filter === 'all' ? 'No requests yet' : `No ${filter} requests`}
              message={
                filter === 'all'
                  ? 'When a recipient asks for food from one of your listings, it appears here.'
                  : 'Try a different filter to see your other requests.'
              }
              actionLabel={filter === 'all' ? 'Back to my listings' : undefined}
              onAction={
                filter === 'all' ? () => navigation.navigate('MyListings') : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.cardTop}>
                <Text style={styles.org} numberOfLines={1}>
                  {item.recipient.organisationName ?? item.recipient.name}
                </Text>
                <StatusPill
                  label={formatStatus(item.status)}
                  tone={toneFor(item.status)}
                />
              </View>

              <Text style={styles.meta} numberOfLines={1}>
                For {item.listing.title}
              </Text>

              <View style={styles.items}>
                {item.items.map((requested) => (
                  <Text key={requested.requestItemId} style={styles.itemLine}>
                    {'•'} {requested.quantityRequested} {requested.item.unit}{' '}
                    {requested.item.foodName}
                  </Text>
                ))}
              </View>

              {!!item.message && <Text style={styles.message}>“{item.message}”</Text>}

              {item.status === 'rejected' && !!item.rejectionReason && (
                <Text style={styles.rejection}>Reason: {item.rejectionReason}</Text>
              )}

              <Text style={styles.received}>
                Received {timeAgo(item.createdAt)} · {formatDateTime(item.createdAt)}
              </Text>
            </Card>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    marginBottom: spacing.sm,
  },
  notice: {
    backgroundColor: colours.surface,
    borderRadius: layout.radius,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  chipOn: { borderColor: colours.accent, backgroundColor: colours.surface },
  chipText: { fontSize: fontSize.secondary, color: colours.textSecondary },
  chipTextOn: { color: colours.accent, fontWeight: fontWeight.semibold },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  org: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  meta: { fontSize: fontSize.secondary, color: colours.textSecondary, lineHeight: 20 },
  items: { marginTop: spacing.xs },
  itemLine: { fontSize: fontSize.secondary, color: colours.textPrimary, lineHeight: 20 },
  message: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  rejection: {
    fontSize: fontSize.secondary,
    color: colours.critical,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  received: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginTop: spacing.sm,
  },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
});
