import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Button,
  Card,
  EmptyState,
  Input,
  ScreenContainer,
  StatusPill,
} from '../../components';
import { confirmPickup, fetchPendingConfirmations } from '../../api/donations.api';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import { formatDateTime, formatStatus } from '../../utils/datetime';
import type { DonorAssignment } from '../../types/assignment';
import type { DonorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DonorStackParamList, 'ConfirmPickup'>;

/**
 * One side of the dual confirmation panel.
 *
 * A handover is only trustworthy if both parties say it happened, so both
 * rows are always visible: the donor can see they are waiting on the driver,
 * or that the driver is waiting on them.
 */
function ConfirmationRow({
  who,
  confirmedAt,
}: {
  who: string;
  confirmedAt: string | null;
}) {
  const done = !!confirmedAt;
  return (
    <View style={styles.confirmRow}>
      <View style={[styles.dot, done ? styles.dotDone : styles.dotPending]}>
        <Text style={styles.dotText}>{done ? '✓' : '·'}</Text>
      </View>
      <View style={styles.confirmText}>
        <Text style={styles.confirmWho}>{who}</Text>
        <Text style={[styles.confirmState, done && styles.confirmStateDone]}>
          {done ? `Confirmed ${formatDateTime(confirmedAt)}` : 'Not confirmed yet'}
        </Text>
      </View>
    </View>
  );
}

/**
 * Confirm Pickup, donor side. Figma frame "06 Pickup Confirmation".
 *
 * Since the coordinator now handles approval, this is the donor's only
 * remaining active step after posting a listing.
 *
 * If the screen is opened without an assignmentId it lists everything waiting
 * on this donor, so it works both as a destination from My Listings and as a
 * direct link to one delivery.
 */
export function ConfirmPickupScreen({ navigation, route }: Props) {
  const focusedId = route.params?.assignmentId;

  const [assignments, setAssignments] = useState<DonorAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await fetchPendingConfirmations();
      setAssignments(focusedId ? rows.filter((a) => a.assignmentId === focusedId) : rows);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [focusedId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleConfirm(assignment: DonorAssignment) {
    setSubmittingId(assignment.assignmentId);
    setError(null);
    try {
      const updated = await confirmPickup(assignment.assignmentId, {
        notes: notes[assignment.assignmentId]?.trim() || null,
      });

      /*
       * Report what the server actually decided rather than assuming. The
       * assignment only moves to in_transit once the driver has confirmed
       * too, and that call is made server side.
       */
      Alert.alert(
        'Pickup confirmed',
        updated.status === 'in_transit'
          ? 'Both you and the driver have confirmed. This delivery is now in transit.'
          : 'Your confirmation is recorded. The delivery moves to in transit once the driver confirms as well.',
      );

      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colours.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (assignments.length === 0) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Nothing to confirm"
          message="When a driver is assigned to collect one of your listings, it appears here for you to confirm the handover."
          actionLabel="Back to my listings"
          onAction={() => navigation.navigate('MyListings')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll avoidKeyboard>
      <Text style={styles.heading}>Confirm pickup</Text>
      <Text style={styles.subtitle}>
        Confirm once the driver has collected the food from you.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {assignments.map((assignment) => {
        const alreadyConfirmed = !!assignment.pickupDonorConfirmedAt;
        const listing = assignment.request.listing;

        return (
          <View key={assignment.assignmentId} style={styles.assignment}>
            {/* Assignment summary */}
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.listingTitle} numberOfLines={1}>
                  {listing.title}
                </Text>
                <StatusPill label={formatStatus(assignment.status)} tone="neutral" />
              </View>
              <Text style={styles.meta}>Delivery #{assignment.assignmentId}</Text>
              <Text style={styles.meta}>
                Driver {assignment.driver.name} · {assignment.driver.phone}
              </Text>
              <Text style={styles.meta}>
                For{' '}
                {assignment.request.recipient.organisationName ??
                  assignment.request.recipient.name}
              </Text>
              <Text style={styles.meta}>Collect from {listing.pickupAddress}</Text>
              <Text style={styles.meta}>
                {formatDateTime(listing.pickupWindowStart)} to{' '}
                {formatDateTime(listing.pickupWindowEnd)}
              </Text>
              {!!assignment.noteToDriver && (
                <Text style={styles.note}>Note: {assignment.noteToDriver}</Text>
              )}
            </Card>

            {/* Dual confirmation panel */}
            <Card style={styles.card}>
              <Text style={styles.cardHeading}>Both parties must confirm</Text>
              <ConfirmationRow
                who="You, the donor"
                confirmedAt={assignment.pickupDonorConfirmedAt}
              />
              <ConfirmationRow
                who={assignment.driver.name}
                confirmedAt={assignment.pickupDriverConfirmedAt}
              />
            </Card>

            {/* Item checklist */}
            <Card style={styles.card}>
              <Text style={styles.cardHeading}>Item checklist</Text>
              {assignment.request.items.map((requested) => {
                const key = `${assignment.assignmentId}:${requested.requestItemId}`;
                const isChecked = !!checked[key];
                return (
                  <Pressable
                    key={requested.requestItemId}
                    onPress={() => setChecked((c) => ({ ...c, [key]: !isChecked }))}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked }}
                    style={styles.checkRow}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxOn]}>
                      {isChecked && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={styles.checkLabel}>
                      {requested.quantityRequested} {requested.item.unit}{' '}
                      {requested.item.foodName}
                    </Text>
                  </Pressable>
                );
              })}
              <Text style={styles.checklistHint}>
                The checklist is for your own use while handing over. It is not sent to
                the server.
              </Text>
            </Card>

            {!alreadyConfirmed && (
              <Input
                label="Notes (optional)"
                value={notes[assignment.assignmentId] ?? ''}
                onChangeText={(text) =>
                  setNotes((n) => ({ ...n, [assignment.assignmentId]: text }))
                }
                placeholder="Anything the coordinator should know"
                multiline
              />
            )}

            {!!assignment.pickupNotes && (
              <Text style={styles.savedNote}>Saved note: {assignment.pickupNotes}</Text>
            )}

            <Button
              label={alreadyConfirmed ? 'You have confirmed' : 'Confirm Pickup'}
              onPress={() => void handleConfirm(assignment)}
              disabled={alreadyConfirmed}
              loading={submittingId === assignment.assignmentId}
            />

            {alreadyConfirmed && !assignment.pickupDriverConfirmedAt && (
              <Text style={styles.waiting}>
                Waiting for {assignment.driver.name} to confirm before this delivery moves
                to in transit.
              </Text>
            )}
          </View>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  assignment: { marginBottom: spacing.xl },
  card: { marginBottom: spacing.md },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  listingTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    flexShrink: 1,
  },
  cardHeading: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  meta: { fontSize: fontSize.secondary, color: colours.textSecondary, lineHeight: 20 },
  note: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colours.accent },
  dotPending: {
    backgroundColor: colours.surface,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
  },
  dotText: { color: colours.textInverse, fontWeight: fontWeight.bold },
  confirmText: { flexShrink: 1 },
  confirmWho: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
  },
  confirmState: { fontSize: fontSize.label, color: colours.textSecondary },
  confirmStateDone: { color: colours.accent },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colours.accent, borderColor: colours.accent },
  checkMark: {
    color: colours.textInverse,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
  },
  checkLabel: { fontSize: fontSize.secondary, color: colours.textPrimary, flexShrink: 1 },
  checklistHint: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  savedNote: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginBottom: spacing.md,
  },
  waiting: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.md,
  },
});
