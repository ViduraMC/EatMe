import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { makeStyles, useTheme, type Tone } from '../theme';

interface InfoBannerProps {
  title?: string;
  message: string;
  tone?: Tone;
  icon?: IconName;
  /** Optional action rendered under the message, e.g. a Button. */
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ICON: Record<Tone, IconName> = {
  neutral: 'information-circle-outline',
  brand: 'sparkles-outline',
  olive: 'leaf-outline',
  info: 'information-circle-outline',
  safe: 'checkmark-circle-outline',
  urgent: 'alert-circle-outline',
  critical: 'warning-outline',
};

/**
 * An inline explanation that stays on screen, unlike a toast. Used where the
 * app must explain *why* something is the way it is, e.g. "The coordinator
 * approves requests; you don't need to do anything here".
 */
export function InfoBanner({
  title,
  message,
  tone = 'info',
  icon,
  action,
  style,
}: InfoBannerProps) {
  const theme = useTheme();
  const styles = useStyles();
  const c = theme.tone(tone);

  return (
    <View
      style={[styles.banner, { backgroundColor: c.bg }, style]}
      accessibilityRole={tone === 'critical' ? 'alert' : undefined}
    >
      <Icon name={icon ?? DEFAULT_ICON[tone]} size={22} color={c.fg} />
      <View style={styles.body}>
        {title ? (
          <AppText variant="secondaryStrong" color={c.fg}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="secondary" color={c.fg}>
          {message}
        </AppText>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    flexDirection: 'row',
    gap: t.spacing.sm + 4,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    marginBottom: t.spacing.md,
  },
  body: { flex: 1, gap: 2 },
  action: { marginTop: t.spacing.sm },
}));
