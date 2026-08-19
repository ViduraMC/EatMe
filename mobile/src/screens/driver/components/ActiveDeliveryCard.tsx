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
}

/**
 * How far along the delivery is.
 *
 * Pickup counts as done once the driver has confirmed it. The donor's half of
 * the confirmation matters to the server, not to this indicator.
 */
function currentStep(assignment: DriverAssignment): 1 | 2 | 3 {
  if (assignment.completedAt) {
    return 3;
  }
  if (assignment.pickupDriverConfirmedAt) {
    return 2;
  }
  return 1;
}

export function ActiveDeliveryCard({ assignment, onConfirm }: ActiveDeliveryCardProps) {
  const step = currentStep(assignment);
  const { listing, recipient } = assignment.request;

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
        label={step >= 2 ? 'Confirm Drop Off' : 'Confirm Pickup'}
        onPress={onConfirm}
      />
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
});
