import * as SecureStore from 'expo-secure-store';

/**
 * The JWT lives in expo-secure-store, not AsyncStorage.
 *
 * SecureStore is backed by the Android Keystore and the iOS Keychain, so the
 * token is encrypted at rest. AsyncStorage is plain unencrypted files, which is
 * the wrong place for a credential.
 */
const TOKEN_KEY = 'eatme.auth.token';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function loadToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A corrupted or unreadable keystore entry should log the user out, not
    // crash the app on launch.
    return null;
  }
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
