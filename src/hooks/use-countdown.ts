import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';

/** Self-timer: counts down once per second with a light tick, then calls `onDone`. Cancellable. */
export function useCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cancel = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRemaining(null);
  };

  const start = (seconds: number, onDone: () => void) => {
    cancel();
    let left = seconds;
    setRemaining(left);
    Haptics.selectionAsync();
    timer.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        cancel();
        onDone();
        return;
      }
      setRemaining(left);
      Haptics.selectionAsync();
    }, 1000);
  };

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  return { remaining, start, cancel };
}
