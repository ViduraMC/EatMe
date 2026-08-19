import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontSize, fontWeight, pillTone, spacing } from '../../../constants/theme';
import type { PillTone } from '../../../constants/theme';
import type { AssignmentStatus } from '../../../types';

interface PillProps {
  label: string;
  tone?: PillTone;
}

export function Pill({ label, tone = 'neutral' }: PillProps) {
  const { background, text } = pillTone[tone];

  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending_driver: 'Awaiting your response',
  accepted: 'Accepted',
  in_transit: 'In Transit',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const STATUS_TONE: Record<AssignmentStatus, PillTone> = {
  pending_driver: 'warning',
  accepted: 'positive',
  in_transit: 'positive',
  completed: 'positive',
  declined: 'negative',
  cancelled: 'neutral',
};

export function statusLabel(status: AssignmentStatus): string {
  return STATUS_LABEL[status];
}

export function statusTone(status: AssignmentStatus): PillTone {
  return STATUS_TONE[status];
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs + 2,
    borderRadius: spacing.md,
  },
  label: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  },
});
