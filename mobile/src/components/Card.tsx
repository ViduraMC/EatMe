import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { makeStyles } from '../theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** flat: border only. raised: soft warm shadow. tinted: brand wash, for highlights. */
  variant?: 'flat' | 'raised' | 'tinted';
  /** Remove the inner padding, for cards with full-bleed headers. */
  noPadding?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The basic surface. Pass onPress to make the whole card a single tap target,
 * which is easier to hit than a small "View" link inside it.
 */
export function Card({
  children,
  onPress,
  variant = 'raised',
  noPadding,
  accessibilityLabel,
  accessibilityHint,
  style,
}: CardProps) {
  const styles = useStyles();
  const composed = [styles.card, styles[variant], noPadding && styles.noPadding, style];

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={composed}
      >
        {children}
      </PressableScale>
    );
  }
  return <View style={composed}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  flat: { borderWidth: 1, borderColor: t.colors.border },
  raised: {
    ...t.elevation(1),
    // Dark mode shadows vanish against dark backgrounds, so a hairline edge
    // does the separating instead.
    borderWidth: t.isDark ? 1 : 0,
    borderColor: t.colors.border,
  },
  tinted: { backgroundColor: t.colors.brandSoft },
  noPadding: { padding: 0, overflow: 'hidden' },
}));
