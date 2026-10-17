import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export function Divider({
  inset = 0,
  style,
}: {
  inset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.border,
          marginLeft: inset,
        },
        style,
      ]}
    />
  );
}
