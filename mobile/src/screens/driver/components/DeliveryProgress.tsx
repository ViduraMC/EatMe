import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours, fontSize, fontWeight, spacing } from '../../../constants/theme';

interface DeliveryProgressProps {
  /** How many of the three steps are done: 1 assigned, 2 picked up, 3 delivered. */
  step: 1 | 2 | 3;
}

const STEPS = ['Assigned', 'Picked Up', 'Delivered'] as const;

/** The three dot indicator on the active delivery card. */
export function DeliveryProgress({ step }: DeliveryProgressProps) {
  return (
    <View>
      <View style={styles.track}>
        {STEPS.map((label, index) => {
          const done = index < step;
          return (
            <React.Fragment key={label}>
              {index > 0 && (
                <View style={[styles.line, index < step && styles.lineDone]} />
              )}
              <View style={[styles.dot, done ? styles.dotDone : styles.dotPending]} />
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.labels}>
        {STEPS.map((label, index) => (
          <Text
            key={label}
            style={[
              styles.label,
              index === 1 && styles.labelCentre,
              index === 2 && styles.labelEnd,
              index < step && styles.labelDone,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const DOT = 14;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  dotDone: { backgroundColor: colours.accent },
  dotPending: {
    backgroundColor: colours.background,
    borderWidth: 2,
    borderColor: colours.border,
  },
  line: {
    flex: 1,
    height: 4,
    backgroundColor: colours.border,
    borderRadius: 2,
  },
  lineDone: { backgroundColor: colours.accent },
  labels: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: fontSize.label,
    color: colours.textSecondary,
  },
  labelCentre: { textAlign: 'center' },
  labelEnd: { textAlign: 'right' },
  labelDone: {
    color: colours.textPrimary,
    fontWeight: fontWeight.medium,
  },
});
