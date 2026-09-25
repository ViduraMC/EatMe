import axios from 'axios';
import { getErrorMessage } from '../api/client';
import type { TKey } from './index';

export type ErrorKind = 'network' | 'timeout' | 'server' | 'unknown';

/**
 * Turns a thrown error into a message for the person using the app, in their
 * language.
 *
 * Connection problems get a plain, translated sentence ("Can't reach EatMe.
 * Check your connection") instead of the developer hint about LAN IPs,
 * which is still logged to the Metro console in development.
 *
 * Messages that come from the API (e.g. "Only 12 packets of rice left") are
 * shown as sent. They are specific and useful, but the API only speaks
 * English, so in Sinhala mode those stay in English.
 */
export function describeError(
  error: unknown,
  t: (key: TKey) => string,
): { kind: ErrorKind; message: string } {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      if (__DEV__) console.warn('[api] timeout:', getErrorMessage(error));
      return { kind: 'timeout', message: t('errors.timeout') };
    }
    if (!error.response) {
      if (__DEV__) console.warn('[api] no response:', getErrorMessage(error));
      return { kind: 'network', message: t('errors.network') };
    }
    const status = error.response.status;
    const serverMessage = getErrorMessage(error);
    if (status >= 500) {
      return { kind: 'server', message: t('errors.generic') };
    }
    return { kind: 'server', message: serverMessage };
  }
  if (error instanceof Error && error.message) {
    return { kind: 'unknown', message: error.message };
  }
  return { kind: 'unknown', message: t('errors.generic') };
}
