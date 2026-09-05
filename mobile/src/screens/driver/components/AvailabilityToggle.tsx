import React from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { colours, fontSize, fontWeight, spacing } from '../../../constants/theme';

interface AvailabilityToggleProps {
  isAvailable: boolean;
  onChange: (next: boolean) => void;
  /** True while the PATCH is in flight. The switch is locked so it cannot double fire. */
  isSaving?: boolean;
}

export function AvailabilityToggle({
  isAvailable,
  onChange,
  isSaving = false,
}: AvailabilityToggleProps) {
  return (
    <View style={styles.wrapper}>
      {isSaving ? (
        <ActivityIndicator size="small" color={colours.accent} />
      ) : (
        <Text style={[styles.label, isAvailable && styles.labelOn]}>
          {isAvailable ? 'Available' : 'Unavailable'}
        </Text>
      )}
      <Switch
        value={isAvailable}
        onValueChange={onChange}
        disabled={isSaving}
        accessibilityLabel="Availability"
        accessibilityRole="switch"
        trackColor={{ false: colours.border, true: colours.accent }}
        thumbColor={colours.background}
        ios_backgroundColor={colours.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
  },
  labelOn: { color: colours.accent },
});
