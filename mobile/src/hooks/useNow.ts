import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time, refreshed every `intervalMs`.
 *
 * "3 hours left" must not freeze at whatever it said when the screen opened,
 * because the whole point of EatMe is that food expires. The timer pauses
 * while the app is in the background and catches up when it comes back.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = setInterval(
      () => setNow(Date.now()),
      intervalMs,
    );

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(Date.now());
        if (!timer) timer = setInterval(() => setNow(Date.now()), intervalMs);
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });

    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
