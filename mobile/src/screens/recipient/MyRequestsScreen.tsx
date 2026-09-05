import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, EmptyState, ScreenContainer, StatusPill } from '../../components';
import { cancelRequest, fetchMyRequests } from '../../api/requests.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { formatDateTime, formatStatus } from '../../utils/datetime';
import type { DonationRequest, RequestStatus } from '../../types/request';
import type { RecipientStackParamList } from '../../navigation/types';

type MyRequestsParamList = RecipientStackParamList & {
  MyRequests: undefined;
  BrowseListings: undefined;
};

type Props = NativeStackScreenProps<MyRequestsParamList, 'MyRequests'>;

type Filter = 'all' | RequestStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

function toneFor(status: RequestStatus): 'safe' | 'critical' | 'neutral' {
  if (status === 'accepted') return 'safe';
  if (status === 'rejected') return 'critical';
  return 'neutral';
}

export function MyRequestsScreen({ navigation }: Props) {
  const [requests, setRequests] = useState<DonationRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (current: Filter, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setRequests(await fetchMyRequests(current === 'all' ? undefined : current));
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

  function confirmCancel(request: DonationRequest) {
    Alert.alert(
      'Withdraw this request?',
      'The donor and the coordinator will no longer see it. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => void doCancel(request.requestId),
        },
      ],
    );
  }

  async function doCancel(requestId: number) {
    setCancellingId(requestId);
    setError(null);
    try {
      await cancelRequest(requestId);
      await load(filter);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.heading}>My requests</Text>

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
                  ? 'Browse available food and ask for what your organisation needs.'
                  : 'Try a different filter to see your other requests.'
              }
              actionLabel={filter === 'all' ? 'Browse food' : undefined}
              onAction={
                filter === 'all' ? () => navigation.navigate('BrowseListings') : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.listing.title}
                </Text>
                <StatusPill
                  label={formatStatus(item.status)}
                  tone={toneFor(item.status)}
                />
              </View>

              <Text style={styles.meta} numberOfLines={1}>
                {item.listing.donor.organisationName ?? item.listing.donor.name}
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

              {item.status === 'accepted' && (
                <Text style={styles.accepted}>
                  Accepted. Collect from {item.listing.pickupAddress}, between{' '}
                  {formatDateTime(item.listing.pickupWindowStart)} and{' '}
                  {formatDateTime(item.listing.pickupWindowEnd)}.
                </Text>
              )}

              <Text style={styles.sent}>Sent {formatDateTime(item.createdAt)}</Text>

              {item.status === 'pending' && (
                <Button
                  label="Withdraw request"
                  variant="secondary"
                  onPress={() => confirmCancel(item)}
                  loading={cancellingId === item.requestId}
                  style={styles.cancelButton}
                />
              )}
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
  cardTitle: {
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
  accepted: {
    fontSize: fontSize.secondary,
    color: colours.accent,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  sent: { fontSize: fontSize.label, color: colours.textSecondary, marginTop: spacing.sm },
  cancelButton: { marginTop: spacing.sm },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.sm,
  },
});
