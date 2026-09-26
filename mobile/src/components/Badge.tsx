import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { makeStyles, useTheme, type Tone } from '../theme';

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: IconName;
  /** A small coloured dot before the label, for live states such as "In transit". */
  dot?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/**
 * A soft coloured label for a status or category.
 *
 * Colour is never the only signal: the text always says the state, so a
 * colour-blind user reads "Critical" rather than decoding red.
 */
export function Badge({
  label,
  tone = 'neutral',
  icon,
  dot,
  size = 'md',
  style,
}: BadgeProps) {
  const theme = useTheme();
  const styles = useStyles();
  const c = theme.tone(tone);

  return (
    <View
      style={[styles.badge, size === 'sm' && styles.sm, { backgroundColor: c.bg }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: c.accent }]} /> : null}
      {icon ? <Icon name={icon} size={size === 'sm' ? 12 : 14} color={c.fg} /> : null}
      <AppText variant="caption" color={c.fg} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

/**
 * The old StatusPill API, kept so screens that have not been migrated still
 * compile. The old "safe/urgent/critical/neutral" tones map straight across.
 */
export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'safe' | 'urgent' | 'critical';
}) {
  return <Badge label={label} tone={tone} />;
}

const useStyles = makeStyles((t) => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.xs + 2,
    paddingHorizontal: t.spacing.sm + 2,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.pill,
  },
  sm: { paddingHorizontal: t.spacing.sm, paddingVertical: 2, gap: t.spacing.xs },
  dot: { width: 7, height: 7, borderRadius: 4 },
}));
