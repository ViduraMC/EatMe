import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  colours,
  fontSize,
  fontWeight,
  spacing,
  urgencyColour,
} from '../constants/theme';
import type { UrgencyLevel } from '../constants/theme';

type Tone = UrgencyLevel | 'neutral';

interface StatusPillProps {
  label: string;
  tone?: Tone;
}

/**
 * A small coloured label for a status or an urgency level.
 *
 * Used for listing.status, request.status, assignment.status and item urgency,
 * so every module shows a status the same way.
 */
export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  const background = tone === 'neutral' ? colours.surface : urgencyColour[tone];
  const textColour = tone === 'neutral' ? colours.textSecondary : colours.textInverse;

  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.text, { color: textColour }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.md,
  },
  text: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
});
