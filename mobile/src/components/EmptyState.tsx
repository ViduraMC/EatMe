import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppText } from './AppText';
import { Button } from './Button';
import { Illustration, type ArtName } from './illustrations/Illustration';
import { makeStyles, useTheme } from '../theme';
import { enterSection, useReducedMotion } from '../theme/animations';
import { useT } from '../i18n';
import { describeError } from '../i18n/errors';

interface EmptyStateProps {
  title: string;
  message?: string;
  illustration?: ArtName;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Smaller illustration, for empty states inside a section rather than a whole screen. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shown when there is nothing to show. An empty screen reads as a bug; an
 * illustration, a plain explanation and the one action that would fill it
 * reads as "nothing yet, and here's what to do".
 */
export function EmptyState({
  title,
  message,
  illustration = 'emptyBowl',
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact,
  style,
}: EmptyStateProps) {
  const styles = useStyles();
  const theme = useTheme();
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={enterSection(0, reduced)}
      style={[styles.wrap, compact && styles.compact, style]}
    >
      <Illustration name={illustration} width={compact ? 160 : 230} />
      <AppText
        variant={compact ? 'subtitle' : 'headline'}
        align="center"
        accessibilityRole="header"
        style={styles.title}
      >
        {title}
      </AppText>
      {message ? (
        <AppText
          variant="body"
          color="textSecondary"
          align="center"
          style={styles.message}
        >
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          inline
          style={[styles.action, { paddingHorizontal: theme.spacing.xl }]}
        />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <Button
          label={secondaryLabel}
          onPress={onSecondary}
          variant="ghost"
          inline
          style={styles.secondary}
        />
      ) : null}
    </Animated.View>
  );
}

interface ErrorStateProps {
  /** The caught error, turned into a readable message. */
  error?: unknown;
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Something failed. Says so plainly, shows the spilled-bowl illustration (or
 * the offline cloud for connection problems) and offers a retry, so a failed
 * load is never a dead end.
 */
export function ErrorState({
  error,
  title,
  message,
  onRetry,
  compact,
  style,
}: ErrorStateProps) {
  const t = useT();
  const described = error ? describeError(error, t) : null;
  const offline = described?.kind === 'network' || described?.kind === 'timeout';
  const detail = message ?? described?.message ?? t('errors.generic');

  return (
    <EmptyState
      illustration={offline ? 'offline' : 'spilled'}
      title={title ?? (offline ? t('errors.offlineTitle') : t('errors.loadFailed'))}
      message={detail}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
      compact={compact}
      style={style}
    />
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: t.spacing.xl,
    paddingHorizontal: t.spacing.lg,
  },
  compact: { flexGrow: 0, paddingVertical: t.spacing.lg },
  title: { marginTop: t.spacing.md },
  message: { marginTop: t.spacing.sm, maxWidth: 320 },
  action: { marginTop: t.spacing.lg },
  secondary: { marginTop: t.spacing.xs },
}));
