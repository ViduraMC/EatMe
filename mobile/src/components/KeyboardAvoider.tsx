import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Keeps its content above the on-screen keyboard, on every screen.
 *
 * Why not a plain KeyboardAvoidingView:
 * - Expo SDK 57 draws edge-to-edge, so Android no longer shrinks the window
 *   for the keyboard; we must add the padding ourselves ('padding' on both
 *   platforms).
 * - KeyboardAvoidingView compares the keyboard's top (in screen coordinates)
 *   with its own position *relative to its parent*. Under a navigation
 *   header those differ by the header's height.
 * - On Android, measureInWindow reports positions from below the status bar
 *   while the keyboard is reported from the top of the screen, so they also
 *   differ by the status bar's height.
 *
 * We measure where this view really is and pass the difference as
 * keyboardVerticalOffset, so the maths lines up everywhere. (Measured on a
 * Redmi with Expo Go: without the status bar term the footer buttons stayed
 * 47dp under the keyboard.)
 */
export function KeyboardAvoider({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState(0);

  const measure = () =>
    ref.current?.measureInWindow((_x, y) => {
      if (!Number.isFinite(y)) return;
      const statusBar = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
      setOffset(Math.round(y + statusBar));
    });

  return (
    <View ref={ref} style={[{ flex: 1 }, style]} onLayout={measure} collapsable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={offset}
      >
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
