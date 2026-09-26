import { useSyncExternalStore } from 'react';

/**
 * How many pickups are waiting for this donor's confirmation, shared between
 * the screens that learn the number (My listings, Pickups) and the tab bar
 * that shows it as a badge.
 *
 * A tiny external store rather than a context, because the tab navigator
 * sits above the screens that fetch the data and only needs this one number.
 */
let count = 0;
const listeners = new Set<() => void>();

export function setPendingPickups(next: number): void {
  if (next === count) return;
  count = next;
  listeners.forEach((l) => l());
}

export function usePendingPickups(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => count,
  );
}
