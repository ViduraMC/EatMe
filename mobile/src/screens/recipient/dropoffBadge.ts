import { useSyncExternalStore } from 'react';

/**
 * How many deliveries are waiting for this recipient's dropoff confirmation,
 * shared between the screens that learn the number (My requests, Confirm dropoff)
 * and the tab bar that shows it as a badge.
 */
let count = 0;
const listeners = new Set<() => void>();

export function setPendingDropoffs(next: number): void {
  if (next === count) return;
  count = next;
  listeners.forEach((l) => l());
}

export function usePendingDropoffs(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => count,
  );
}
