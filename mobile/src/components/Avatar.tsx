import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { makeStyles, useTheme, type Tone } from '../theme';

interface AvatarProps {
  name: string;
  size?: number;
  /** Show an icon instead of initials, e.g. a building for organisations. */
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

const TONES: Tone[] = ['brand', 'olive', 'info', 'urgent', 'safe'];

/** Stable colour per name, so "Sahana Children's Home" is always the same colour. */
function toneFor(name: string): Tone {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TONES[Math.abs(hash) % TONES.length] ?? 'brand';
}

function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Initials on a soft tone. There are no profile photos in EatMe (camera and
 * uploads are out of scope), so a consistent colour per person or
 * organisation is what makes a list scannable at a glance.
 */
export function Avatar({ name, size = 44, icon, style }: AvatarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const c = theme.tone(toneFor(name));

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg },
        style,
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {icon ? (
        <Icon name={icon} size={size * 0.48} color={c.fg} />
      ) : (
        <AppText
          variant="bodyStrong"
          color={c.fg}
          style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}
        >
          {initials(name)}
        </AppText>
      )}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  base: { alignItems: 'center', justifyContent: 'center' },
}));
