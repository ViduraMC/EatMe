import React, { useEffect, useRef } from 'react';
import { Keyboard, ScrollView, TextInput, type ScrollViewProps } from 'react-native';

/** Space kept between the focused field and the edge of the visible area. */
const MARGIN = 32;

/**
 * A ScrollView for forms that brings the focused field fully into view when
 * the keyboard opens.
 *
 * KeyboardAvoider shrinks the screen above the keyboard, but the field you
 * tapped can still end up half under the sticky footer (e.g. the multi-line
 * address box on Create account). When the keyboard appears we measure the
 * focused field and the visible part of this scroll view, and scroll by
 * exactly the overlap. Moving between fields afterwards is handled by
 * Android itself, which scrolls a newly focused field into view.
 *
 * React Native's own scrollResponderScrollNativeHandleToKeyboard assumes the
 * scroll view fills the whole screen, which is not true with a footer.
 */
export function FormScrollView({ children, onScroll, ...props }: ScrollViewProps) {
  const ref = useRef<ScrollView>(null);
  const offset = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      // Wait a frame or two for KeyboardAvoider's new layout to apply.
      timer = setTimeout(reveal, 80);
    });
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);

  function reveal() {
    const scroll = ref.current;
    const view = scroll?.getNativeScrollRef();
    const input = TextInput.State.currentlyFocusedInput();
    if (!scroll || !view || !input) return;

    view.measureInWindow((_sx, viewTop, _sw, viewHeight) => {
      input.measureInWindow((_tx, fieldTop, _tw, fieldHeight) => {
        const below = fieldTop + fieldHeight + MARGIN - (viewTop + viewHeight);
        const above = viewTop - (fieldTop - MARGIN);
        const y = offset.current;
        if (below > 0) scroll.scrollTo({ y: y + below, animated: true });
        else if (above > 0)
          scroll.scrollTo({ y: Math.max(0, y - above), animated: true });
      });
    });
  }

  return (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...props}
      onScroll={(e) => {
        offset.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      }}
    >
      {children}
    </ScrollView>
  );
}
