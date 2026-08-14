import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colours, layout } from '../constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Wrap the content in a ScrollView. Do not use with a FlatList. */
  scroll?: boolean;
  /** Lift content above the keyboard. Use on any screen with a text input. */
  avoidKeyboard?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
}

/**
 * The outer wrapper for every screen: safe area, background and the 16px
 * screen padding from the wireframes.
 *
 * Using this everywhere is what stops one module's screens sitting under the
 * notch while another's do not.
 */
export function ScreenContainer({
  children,
  scroll = false,
  avoidKeyboard = false,
  edges = ['top', 'left', 'right', 'bottom'],
  style,
}: ScreenContainerProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colours.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: layout.screenPadding,
  },
});
