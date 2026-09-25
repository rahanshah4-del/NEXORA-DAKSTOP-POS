import { useState, useEffect } from 'react';

/**
 * A clock tick, emitted every 30 seconds.
 *
 * Returns the tick's epoch milliseconds. This hook deliberately does NOT format
 * anything: it used to return a hardcoded `en-US` string, which is why the
 * dashboard clock disagreed with the rest of the app. Callers pass the returned
 * value as an effect/memo dependency and format the time themselves, so there
 * is exactly one place deciding how a time is displayed.
 */
export function useLiveClock(): number {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return tick;
}
