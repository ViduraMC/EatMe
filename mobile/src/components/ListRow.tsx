import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme, type Tone } from '../theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: Tone;
  /** Text on the right, e.g. the current value of a setting. */
  value?: string;
  /** Anything on the right instead of `value`, e.g. a Toggle. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Show the chevron that says "this opens something". Defaults to true when pressable. */
  chevron?: boolean;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A settings-style row: icon, label, value, chevron. At least 56 tall. */
export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'neutral',
  value,
  trailing,
  onPress,
  chevron,
  destructive,
  style,
}: ListRowProps) {
  const theme = useTheme();
  const styles = useStyles();
  const c = theme.tone(destructive ? 'critical' : iconTone);
  const showChevron = chevron ?? !!onPress;

  const content = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
          <Icon name={icon} size={19} color={c.fg} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="callout" color={destructive ? 'criticalText' : 'text'}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ??
        (value ? (
          <AppText
            variant="secondary"
            color="textSecondary"
            numberOfLines={1}
            style={styles.value}
          >
            {value}
          </AppText>
        ) : null)}
      {showChevron ? (
        <Icon name="chevron-forward" size={18} color="textTertiary" />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityLabel={value ? `${title}, ${value}` : title}
        accessibilityHint={subtitle}
        style={[styles.row, style]}
      >
        {content}
      </PressableScale>
    );
  }
  return <View style={[styles.row, style]}>{content}</View>;
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    paddingVertical: t.spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: t.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  value: { maxWidth: '45%' },
}));
