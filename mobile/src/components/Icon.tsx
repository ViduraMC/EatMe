import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, type Palette } from '../theme';

type IonName = keyof typeof Ionicons.glyphMap;
type McName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Ionicons by default. Prefix with "mc:" for Material Community Icons, which
 * has the food-specific glyphs Ionicons lacks (bread, rice, pot, hand-heart):
 *
 *   <Icon name="time-outline" />
 *   <Icon name="mc:bread-slice-outline" />
 */
export type IconName = IonName | `mc:${McName}`;

type ColorToken = {
  [K in keyof Palette]: Palette[K] extends string ? K : never;
}[keyof Palette];

interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorToken | (string & {});
  /**
   * Decorative icons are hidden from screen readers by default, because the
   * text beside them already says the same thing. Pass a label only when the
   * icon stands alone and carries meaning.
   */
  accessibilityLabel?: string;
}

export function Icon({ name, size = 22, color = 'text', accessibilityLabel }: IconProps) {
  const theme = useTheme();
  const resolved =
    color in theme.colors ? (theme.colors[color as ColorToken] as string) : color;

  const a11y = accessibilityLabel
    ? { accessible: true, accessibilityLabel, accessibilityRole: 'image' as const }
    : { accessible: false, importantForAccessibility: 'no-hide-descendants' as const };

  if (name.startsWith('mc:')) {
    return (
      <MaterialCommunityIcons
        name={name.slice(3) as McName}
        size={size}
        color={resolved}
        {...a11y}
      />
    );
  }
  return <Ionicons name={name as IonName} size={size} color={resolved} {...a11y} />;
}
