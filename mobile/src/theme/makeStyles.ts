import { StyleSheet } from 'react-native';
import { useTheme, type Theme } from './ThemeProvider';

/**
 * Theme-aware StyleSheet.
 *
 *   const useStyles = makeStyles((t) => ({
 *     card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg },
 *   }));
 *
 *   function MyCard() {
 *     const styles = useStyles();
 *     ...
 *   }
 *
 * Styles are compiled once per theme object and cached, so switching between
 * light and dark costs one StyleSheet.create per component type, not one per
 * render. This replaces the old static `colours` import, which could never
 * change at runtime and therefore could never support dark mode.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): () => T {
  const cache = new WeakMap<Theme, T>();

  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
