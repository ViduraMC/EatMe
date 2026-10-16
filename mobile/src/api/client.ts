import axios, { AxiosError } from 'axios';
import type { ApiFailure } from '../types';

/**
 * The single axios instance every module uses.
 *
 * Do not create another one. The token attachment and the 401 handling below
 * only apply to requests made through this instance.
 */

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  // Thrown at import time on purpose. A missing base URL produces a stream of
  // confusing network errors later; this points straight at the cause.
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env and put your ' +
      "laptop's LAN IP in it, then restart Expo with: npm run start:clear",
  );
}

if (!__DEV__ && !baseURL.startsWith('https://')) {
  // A store build talking plain HTTP would send passwords and tokens in the
  // clear, and Android blocks it anyway. Fail at startup rather than ship it.
  throw new Error(
    `Release builds need an https:// EXPO_PUBLIC_API_URL, got "${baseURL}". See RELEASE.md.`,
  );
}

if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1')) {
  // Not fatal on an emulator, but on a real phone "localhost" is the phone.
  console.warn(
    `[api] EXPO_PUBLIC_API_URL is "${baseURL}". On a physical device this points at the ` +
      'phone itself, not your laptop. Use the LAN IP the API prints at startup.',
  );
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Held in a module variable rather than read from SecureStore on every request,
 * because the interceptor is synchronous and a keystore read is not.
 * AuthContext keeps this in step with what is stored.
 */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Called when the server rejects our token. AuthContext registers the logout. */
let onUnauthorised: (() => void) | null = null;

export function setUnauthorisedHandler(handler: (() => void) | null): void {
  onUnauthorised = handler;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiFailure>) => {
    // 401 means the token is missing, expired or no longer valid. Anything the
    // app does next would fail too, so drop the session and return to login.
    // 403 is deliberately NOT included: that is a valid session hitting a route
    // for another role, and logging the user out would be wrong.
    if (error.response?.status === 401) {
      onUnauthorised?.();
    }
    return Promise.reject(error);
  },
);

/**
 * Turns any thrown error into a message worth showing a user.
 *
 * Covers the API's error envelope, zod field errors, and the case where the
 * request never reached the server at all, which on this project is nearly
 * always the LAN address being wrong.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    const data = error.response?.data;

    if (data?.details) {
      const first = Object.values(data.details)[0];
      if (first && first.length > 0) {
        return first[0] as string;
      }
    }

    if (data?.message) {
      return data.message;
    }

    if (error.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Is it still running?';
    }

    if (!error.response) {
      return (
        'Cannot reach the server. Check that the API is running, that your phone and ' +
        'laptop are on the same Wi-Fi, and that EXPO_PUBLIC_API_URL uses the LAN IP.'
      );
    }

    return `Request failed with status ${error.response.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong';
}
