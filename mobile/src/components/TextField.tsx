import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { MAX_FONT_SCALE, makeStyles, useTheme } from '../theme';
import { useT } from '../i18n';
import { haptics } from '../utils/haptics';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Shown under the field when there is no error. */
  helper?: string;
  error?: string;
  /** Adds "(optional)" to the label. Required fields are the default and are not starred. */
  optional?: boolean;
  icon?: IconName;
  /** Password fields get a show/hide toggle. */
  secure?: boolean;
  /** Clear button once there is text. */
  clearable?: boolean;
  /** Show "12/500" under the field; needs maxLength. */
  showCount?: boolean;
  /** Content on the right edge, e.g. a unit such as "kg". */
  trailing?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Text input with a permanent label above it.
 *
 * Floating labels were considered and rejected: they shrink into the border
 * once you type, so the label is hardest to read exactly when you are
 * checking what you entered. A label above the field is always legible.
 *
 * Errors shake the field once and buzz once, so they are noticed. The message
 * is also announced by screen readers through accessibilityHint.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    helper,
    error,
    optional,
    icon,
    secure,
    clearable,
    showCount,
    trailing,
    containerStyle,
    style,
    value,
    onChangeText,
    onFocus,
    onBlur,
    multiline,
    maxLength,
    editable = true,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const styles = useStyles();
  const t = useT();
  const reduced = useReducedMotion();

  const [hidden, setHidden] = useState(!!secure);
  const focus = useSharedValue(0);
  const shake = useSharedValue(0);
  const previousError = useRef<string | undefined>(undefined);

  // Shake and buzz only when a *new* error appears, not on every render.
  useEffect(() => {
    if (error && error !== previousError.current) {
      haptics.error();
      if (!reduced) {
        shake.value = withSequence(
          withTiming(-6, { duration: 50 }),
          withTiming(6, { duration: 50 }),
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        );
      }
    }
    previousError.current = error;
  }, [error, reduced, shake]);

  const errorColor = theme.colors.critical;
  const idle = theme.colors.borderStrong;
  const active = theme.colors.brand;

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? errorColor
      : interpolateColor(focus.value, [0, 1], [idle, active]),
    borderWidth: 1 + focus.value * 0.75,
    transform: [{ translateX: shake.value }],
  }));

  const hint = error ?? helper;
  const hasText = !!value && value.length > 0;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={styles.labelRow}>
        <AppText variant="secondaryStrong">
          {label}
          {optional ? (
            <AppText variant="secondary" color="textSecondary">
              {`  (${t('common.optional').toLowerCase()})`}
            </AppText>
          ) : null}
        </AppText>
      </View>

      <Animated.View
        style={[
          styles.box,
          multiline && styles.multilineBox,
          !editable && styles.disabled,
          boxStyle,
          style,
        ]}
      >
        {icon ? <Icon name={icon} size={20} color="textSecondary" /> : null}
        <TextInput
          ref={ref}
          {...rest}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          multiline={multiline}
          maxLength={maxLength}
          secureTextEntry={hidden}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          placeholderTextColor={theme.colors.textTertiary}
          selectionColor={theme.colors.brand}
          cursorColor={theme.colors.brand}
          accessibilityLabel={optional ? `${label}, ${t('common.optional')}` : label}
          accessibilityHint={hint}
          accessibilityState={{ disabled: !editable }}
          onFocus={(e) => {
            focus.value = withTiming(1, { duration: theme.motion.duration.fast });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focus.value = withTiming(0, { duration: theme.motion.duration.fast });
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { fontFamily: theme.fonts.regular, color: theme.colors.text },
            multiline && styles.multilineInput,
          ]}
        />
        {clearable && hasText && editable ? (
          <PressableScale
            onPress={() => onChangeText?.('')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.clearText')}
          >
            <Icon name="close-circle" size={20} color="textTertiary" />
          </PressableScale>
        ) : null}
        {secure ? (
          <PressableScale
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('a11y.showPassword') : t('a11y.hidePassword')}
          >
            <Icon
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={21}
              color="textSecondary"
            />
          </PressableScale>
        ) : null}
        {trailing}
      </Animated.View>

      {hint || (showCount && maxLength) ? (
        <View style={styles.footer}>
          {hint ? (
            <View style={styles.hintRow}>
              {error ? <Icon name="alert-circle" size={15} color="criticalText" /> : null}
              <AppText
                variant="caption"
                color={error ? 'criticalText' : 'textSecondary'}
                style={styles.hintText}
                accessibilityLiveRegion={error ? 'polite' : 'none'}
              >
                {hint}
              </AppText>
            </View>
          ) : (
            <View />
          )}
          {showCount && maxLength ? (
            <AppText variant="caption" color="textTertiary">
              {`${value?.length ?? 0}/${maxLength}`}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

/**
 * The old Input API (label, error, ...TextInputProps), kept so screens that
 * have not been redesigned yet still compile.
 */
export const Input = TextField;

const useStyles = makeStyles((t) => ({
  wrapper: { marginBottom: t.spacing.md + 4 },
  labelRow: { marginBottom: t.spacing.sm },
  box: {
    minHeight: t.layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 2,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
  },
  multilineBox: { alignItems: 'flex-start', paddingVertical: t.spacing.sm + 4 },
  disabled: { backgroundColor: t.colors.surfaceMuted, opacity: 0.7 },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: t.spacing.sm + 2,
  },
  multilineInput: { minHeight: 96, textAlignVertical: 'top', paddingVertical: 0 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: t.spacing.xs + 2,
    gap: t.spacing.sm,
  },
  hintRow: { flexDirection: 'row', gap: t.spacing.xs, flex: 1 },
  hintText: { flex: 1 },
}));
