import React from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { MAX_FONT_SCALE, useTheme, type Palette, type TextVariant } from '../theme';

type ColorToken = {
  [K in keyof Palette]: Palette[K] extends string ? K : never;
}[keyof Palette];

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  /** A palette token ("textSecondary", "brandText") or any colour string. */
  color?: ColorToken | (string & {});
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

/**
 * The only way text is drawn in EatMe.
 *
 * It picks the typeface for the current language (Fraunces / Plus Jakarta
 * Sans in English, Noto Sans Sinhala in Sinhala) and the colour for the
 * current theme. It honours the phone's text-size setting up to
 * MAX_FONT_SCALE, beyond which fixed-height controls would clip.
 */
export function AppText({
  variant = 'body',
  color = 'text',
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const resolved =
    color in theme.colors ? (theme.colors[color as ColorToken] as string) : color;

  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        theme.text[variant],
        { color: resolved },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
