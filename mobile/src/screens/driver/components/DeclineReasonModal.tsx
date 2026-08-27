import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input } from '../../../components';
import { colours, fontSize, fontWeight, layout, spacing } from '../../../constants/theme';

interface DeclineReasonModalProps {
  visible: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (declineReason: string) => void;
}

/** Matches declineAssignmentSchema in server/src/controllers/driver.controller.ts. */
const MAX_REASON_LENGTH = 500;

/** Common reasons, tap to fill the field below rather than being sent as-is. */
const PRESET_REASONS = [
  'Vehicle problem',
  'Too far from my location',
  'Running behind on another delivery',
  'Personal emergency',
] as const;

/**
 * Bottom-sheet style modal for declining an assignment (US-DR02).
 *
 * A coordinator needs to know *why* a driver is unavailable so they can
 * reassign, which is why decline requires a reason and accept does not.
 */
export function DeclineReasonModal({
  visible,
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: DeclineReasonModalProps) {
  const [reason, setReason] = useState('');

  // Start each open with a blank field rather than whatever was left over
  // from the last assignment this driver declined (or cancelled out of).
  useEffect(() => {
    if (visible) {
      setReason('');
    }
  }, [visible]);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  const close = () => {
    if (isSubmitting) {
      return;
    }
    setReason('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      {/*
        RN's Modal renders as its own Android Dialog window, so the Activity's
        adjustResize never reaches it - "height" is what actually lifts the
        sheet above the keyboard there. iOS keeps the usual "padding".
      */}
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Decline assignment</Text>
          <Text style={styles.subtitle}>
            Let the coordinator know why, so they can find another driver.
          </Text>

          <View style={styles.presets}>
            {PRESET_REASONS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setReason(preset)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.chip,
                  reason === preset && styles.chipActive,
                  pressed && reason !== preset && styles.chipPressed,
                ]}
              >
                <Text
                  style={[styles.chipLabel, reason === preset && styles.chipLabelActive]}
                >
                  {preset}
                </Text>
              </Pressable>
            ))}
          </View>

          <Input
            label="Reason"
            placeholder="Describe why you can't take this delivery"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={MAX_REASON_LENGTH}
            error={errorMessage ?? undefined}
          />

          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={close}
              disabled={isSubmitting}
              style={styles.cancelButton}
            />
            <Button
              label="Confirm decline"
              variant="danger"
              onPress={() => onSubmit(trimmed)}
              disabled={!canSubmit}
              loading={isSubmitting}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(24, 24, 27, 0.4)',
  },
  sheet: {
    backgroundColor: colours.background,
    borderTopLeftRadius: layout.radius,
    borderTopRightRadius: layout.radius,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.background,
  },
  chipActive: {
    backgroundColor: colours.textPrimary,
    borderColor: colours.textPrimary,
  },
  chipPressed: { backgroundColor: colours.surface },
  chipLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colours.textSecondary,
  },
  chipLabelActive: { color: colours.textInverse },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs,
    marginTop: spacing.sm,
  },
  cancelButton: { flex: 1 },
  confirmButton: { flex: 1.4 },
});
