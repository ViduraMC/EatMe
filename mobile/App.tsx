import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

/**
 * Provider order matters.
 *
 * SafeAreaProvider must wrap everything, because ScreenContainer reads the
 * insets from it. AuthProvider must sit above RootNavigator, because the
 * navigator decides which stack to mount from the user it reads out of the
 * auth context.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
