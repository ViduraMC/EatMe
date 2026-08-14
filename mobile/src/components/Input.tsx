import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colours, fontSize, fontWeight, layout, spacing } from '../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, style, multiline, ...rest }: InputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          !!error && styles.inputError,
          style,
        ]}
        placeholderTextColor={colours.textSecondary}
        multiline={multiline}
        {...rest}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    height: layout.controlHeight,
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    color: colours.textPrimary,
    backgroundColor: colours.background,
  },
  multiline: {
    height: layout.controlHeight * 2,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: colours.critical },
  error: {
    fontSize: fontSize.label,
    color: colours.critical,
    marginTop: spacing.xs,
  },
});
