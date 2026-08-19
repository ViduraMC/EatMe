import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours, fontSize, fontWeight, layout, spacing } from '../../../constants/theme';

interface StatCardProps {
  value: number | string;
  label: string;
}

/** One of the two grey figures at the top of the dashboard and the history screen. */
export function StatCard({ value, label }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/** Puts two StatCards side by side with the gap from the wireframe. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: colours.surface,
    borderRadius: layout.radius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  value: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  label: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginTop: spacing.xs,
  },
});
