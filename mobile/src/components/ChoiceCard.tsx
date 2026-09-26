import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { makeStyles, useTheme, type Tone } from '../theme';
import { haptics } from '../utils/haptics';
import type { Language } from '../i18n/types';

interface ChoiceCardProps {
  title: string;
  description?: string;
  icon?: IconName;
  tone?: Tone;
  selected: boolean;
  onPress: () => void;
  /** Extra content under the description, e.g. a driver's availability. */
  footer?: React.ReactNode;
  /** Radio for one-of-many (default), checkbox for many-of-many. */
  mode?: 'radio' | 'checkbox';
  disabled?: boolean;
  /** Language of the title and description, if not the app's (see AppText). */
  lang?: Language;
  style?: StyleProp<ViewStyle>;
}

/**
 * A large selectable card: role at sign-up, driver for an assignment. Big
 * targets with an icon and a one-line explanation make a choice easier to
 * understand than a bare radio list.
 */
export function ChoiceCard({
  title,
  description,
  icon,
  tone = 'brand',
  selected,
  onPress,
  footer,
  mode = 'radio',
  disabled,
  lang,
  style,
}: ChoiceCardProps) {
  const theme = useTheme();
  const styles = useStyles();
  const c = theme.tone(tone);

  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      disabled={disabled}
      scaleTo={0.98}
      accessibilityRole={mode}
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      style={[
        styles.card,
        selected && { borderColor: c.accent, backgroundColor: c.bg },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: selected ? theme.colors.surface : c.bg },
          ]}
        >
          <Icon name={icon} size={24} color={c.fg} />
        </View>
      ) : null}
      <View style={styles.body}>
        <AppText variant="bodyStrong" color={selected ? c.fg : 'text'} lang={lang}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="secondary" color="textSecondary" lang={lang}>
            {description}
          </AppText>
        ) : null}
        {footer}
      </View>
      <View
        style={[
          mode === 'radio' ? styles.radio : styles.check,
          selected && { borderColor: c.accent, backgroundColor: c.accent },
        ]}
      >
        {selected ? (
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <Icon name="checkmark" size={14} color={theme.colors.onBrand} />
          </Animated.View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm + 4,
    padding: t.spacing.md,
    borderRadius: t.radius.lg,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    marginBottom: t.spacing.sm + 4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
}));
