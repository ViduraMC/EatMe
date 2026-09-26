import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LanguageProvider, isLanguage, type Language } from './src/i18n';
import {
  ThemeProvider,
  fontAssets,
  isThemePreference,
  useTheme,
  type ThemePreference,
} from './src/theme';
import { readPref } from './src/utils/preferences';
import { ConfirmProvider, ToastProvider } from './src/components';

// Keep the native splash up until fonts and saved preferences are ready, so
// the first frame is already in the right language, theme and typeface.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, e.g. after a fast refresh. Nothing to do.
});

interface Boot {
  language: Language;
  theme: ThemePreference;
  onboarded: boolean;
}

function ThemedStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.isDark ? 'light' : 'dark'} />;
}

/**
 * Provider order matters:
 *
 * - GestureHandlerRootView wraps everything so sheets and slide-to-confirm
 *   can receive gestures anywhere on screen.
 * - LanguageProvider sits above ThemeProvider, because the theme picks the
 *   Sinhala or Latin typeface from the current language.
 * - ToastProvider and ConfirmProvider sit inside the theme, because toasts
 *   and confirm sheets are themed, and above every screen that uses them.
 * - AuthProvider sits above RootNavigator, which mounts a stack per role.
 */
export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [boot, setBoot] = useState<Boot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [language, theme, onboarded] = await Promise.all([
        readPref('language'),
        readPref('theme'),
        readPref('onboarded'),
      ]);
      if (!cancelled) {
        setBoot({
          language: isLanguage(language) ? language : 'en',
          theme: isThemePreference(theme) ? theme : 'system',
          onboarded: onboarded === 'yes',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = (fontsLoaded || !!fontError) && boot !== null;

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
      <SafeAreaProvider>
        <LanguageProvider initialLanguage={boot.language}>
          <ThemeProvider initialPreference={boot.theme}>
            <ToastProvider>
              <ConfirmProvider>
                <OnboardingProvider initial={boot.onboarded}>
                  <AuthProvider>
                    <ThemedStatusBar />
                    <RootNavigator />
                  </AuthProvider>
                </OnboardingProvider>
              </ConfirmProvider>
            </ToastProvider>
          </ThemeProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
