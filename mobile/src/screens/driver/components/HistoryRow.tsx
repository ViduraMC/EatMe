import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../components';
import {
  colours,
  fontSize,
  fontWeight,
  spacing,
  surfaceDanger,
} from '../../../constants/theme';
import { formatDayAndTime } from '../../../utils/datetime';
import { Pill, statusLabel, statusTone } from './Pill';
import type { DriverAssignment } from '../../../types';

interface HistoryRowProps {
  assignment: DriverAssignment;
}

/** One past assignment. A declined one also shows the reason the driver gave. */
export function HistoryRow({ assignment }: HistoryRowProps) {
  const { listing, recipient } = assignment.request;
  const timestamp =
    assignment.completedAt ?? assignment.respondedAt ?? assignment.assignedAt;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery #{assignment.assignmentId}</Text>
        <Pill
          label={statusLabel(assignment.status)}
          tone={statusTone(assignment.status)}
        />
      </View>

      <View style={styles.route}>
        <View style={styles.dot} />
        <Text style={styles.routeText}>
          {listing.donor.name} {'  to  '} {recipient.name}
        </Text>
      </View>

      <Text style={styles.timestamp}>{formatDayAndTime(timestamp)}</Text>

      {assignment.status === 'declined' && !!assignment.declineReason && (
        <View style={styles.reason}>
          <Text style={styles.reasonLabel}>Your decline reason</Text>
          <Text style={styles.reasonText}>&ldquo;{assignment.declineReason}&rdquo;</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm + spacing.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.body + 2,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm + spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colours.accent,
  },
  routeText: {
    flex: 1,
    fontSize: fontSize.secondary,
    color: colours.textPrimary,
  },
  timestamp: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginTop: spacing.sm,
  },
  reason: {
    backgroundColor: surfaceDanger,
    borderRadius: spacing.sm,
    padding: spacing.sm + spacing.xs,
    marginTop: spacing.sm + spacing.xs,
  },
  reasonLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colours.critical,
  },
  reasonText: {
    fontSize: fontSize.label,
    color: colours.critical,
    marginTop: 2,
    lineHeight: 18,
  },
});
