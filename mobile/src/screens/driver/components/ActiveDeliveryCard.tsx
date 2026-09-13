import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card } from '../../../components';
import { colours, fontSize, fontWeight, spacing } from '../../../constants/theme';
import { DeliveryProgress } from './DeliveryProgress';
import { Pill, statusLabel, statusTone } from './Pill';
import type { DriverAssignment } from '../../../types';

interface ActiveDeliveryCardProps {
  assignment: DriverAssignment;
  onConfirm: () => void;
  isConfirming?: boolean;
}

/**
 * How far along the delivery is.
 *
 * Driven by status, not by the driver's own confirmation flag: the
 * assignment only becomes in_transit once BOTH the driver and the donor have
 * confirmed pickup (US-DR03), so status is what actually reflects progress.
 * A driver who has confirmed but is still waiting on the donor is still on
 * step 1 as far as the server is concerned.
 */
function currentStep(assignment: DriverAssignment): 1 | 2 | 3 {
  if (assignment.completedAt) {
    return 3;
  }
  if (assignment.status === 'in_transit') {
    return 2;
  }
  return 1;
}

export function ActiveDeliveryCard({
  assignment,
  onConfirm,
  isConfirming = false,
}: ActiveDeliveryCardProps) {
  const step = currentStep(assignment);
  const { listing, recipient } = assignment.request;

  // Waiting on the donor: the driver has already confirmed pickup, but the
  // assignment stays "accepted" until the donor confirms too, so there is
  // nothing left for the driver to do here yet.
  const awaitingDonorPickup =
    assignment.status === 'accepted' && !!assignment.pickupDriverConfirmedAt;
  const canConfirmDropoff = assignment.status === 'in_transit';

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Assignment #{assignment.assignmentId}</Text>
        <Pill
          label={statusLabel(assignment.status)}
          tone={statusTone(assignment.status)}
        />
      </View>

      <Text style={styles.route}>
        {listing.donor.name} to {recipient.name}
      </Text>

      <View style={styles.progress}>
        <DeliveryProgress step={step} />
      </View>

      <Button
        label={
          canConfirmDropoff
            ? 'Confirm Drop Off'
            : awaitingDonorPickup
              ? 'You have confirmed'
              : 'Confirm Pickup'
        }
        onPress={onConfirm}
        disabled={awaitingDonorPickup}
        loading={isConfirming}
      />

      {awaitingDonorPickup && (
        <Text style={styles.waiting}>
          Waiting for {listing.donor.name} to confirm pickup before this delivery moves to
          in transit.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  route: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.sm,
  },
  progress: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  waiting: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
