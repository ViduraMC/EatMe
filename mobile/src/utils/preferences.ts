import * as SecureStore from 'expo-secure-store';

/**
 * Small user preferences that must survive an app restart.
 *
 * These sit in expo-secure-store alongside the auth token because it is the
 * only persistent store on the approved dependency list. None of these values
 * is sensitive; if the store fails, the app falls back to the defaults rather
 * than crashing, because a forgotten theme choice is not worth a crash.
 */

const KEYS = {
  theme: 'eatme.pref.theme',
  language: 'eatme.pref.language',
  onboarded: 'eatme.pref.onboarded',
} as const;

type PrefKey = keyof typeof KEYS;

export async function readPref(key: PrefKey): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS[key]);
  } catch {
    return null;
  }
}

export async function writePref(key: PrefKey, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEYS[key], value);
  } catch {
    // Non-fatal: the choice still applies for this session.
  }
}
