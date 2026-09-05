import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components';
import { colours, fontSize, fontWeight, layout, spacing } from '../../../constants/theme';
import { formatDayAndTime, formatDeadline } from '../../../utils/datetime';
import { Pill, statusLabel, statusTone } from './Pill';
import type { DriverAssignment } from '../../../types';

interface NewAssignmentCardProps {
  assignment: DriverAssignment;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

/** "Chicken Fried Rice · 30 servings · Chilled" */
function summariseItems(assignment: DriverAssignment): string {
  const [first] = assignment.request.items;
  if (!first) {
    return assignment.request.listing.title;
  }

  const storage = first.item.storageType;
  return [
    first.item.foodName,
    `${first.quantityRequested} ${first.item.unit}`,
    storage.charAt(0).toUpperCase() + storage.slice(1),
  ].join(' \u00B7 ');
}

export function NewAssignmentCard({
  assignment,
  onAccept,
  onDecline,
  isAccepting = false,
  isDeclining = false,
}: NewAssignmentCardProps) {
  const { listing, recipient } = assignment.request;
  const isResponding = isAccepting || isDeclining;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Assignment #{assignment.assignmentId}</Text>
        <Pill
          label={statusLabel(assignment.status)}
          tone={statusTone(assignment.status)}
        />
      </View>

      <View style={styles.leg}>
        <View style={styles.marker}>
          <View style={styles.dot} />
        </View>
        <View style={styles.legBody}>
          <Text style={styles.legLabel}>Pickup</Text>
          <Text style={styles.legValue}>{listing.pickupAddress}</Text>
          <Text style={styles.legMeta}>
            {formatDayAndTime(listing.pickupWindowStart)}
          </Text>
        </View>
      </View>

      <View style={styles.leg}>
        <View style={styles.marker}>
          <Text style={styles.caret}>{'\u25BC'}</Text>
        </View>
        <View style={styles.legBody}>
          <Text style={styles.legLabel}>Deliver to</Text>
          <Text style={styles.legValue}>{recipient.address}</Text>
          <Text style={styles.legMeta}>{formatDeadline(listing.pickupWindowEnd)}</Text>
        </View>
      </View>

      <View style={styles.itemStrip}>
        <Text style={styles.itemText}>{summariseItems(assignment)}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Decline"
          variant="secondary"
          onPress={onDecline}
          loading={isDeclining}
          disabled={isResponding}
          style={styles.decline}
        />
        <Button
          label="Accept"
          onPress={onAccept}
          loading={isAccepting}
          disabled={isResponding}
          style={styles.accept}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: colours.accent,
    borderRadius: layout.radius,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  leg: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  marker: {
    width: spacing.lg,
    paddingTop: 3,
    alignItems: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colours.accent,
  },
  caret: {
    fontSize: 10,
    color: colours.textPrimary,
    lineHeight: 12,
  },
  legBody: { flex: 1 },
  legLabel: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  legValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
    marginTop: 2,
  },
  legMeta: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginTop: 2,
  },
  itemStrip: {
    backgroundColor: colours.surface,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm + spacing.xs,
    marginBottom: spacing.md,
  },
  itemText: {
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs,
  },
  decline: { flex: 1 },
  accept: { flex: 1.4 },
});
