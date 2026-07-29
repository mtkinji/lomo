import { useCallback, useEffect, useState } from 'react';

export function bankRollButtonLabel(rolling: boolean, remainingSeconds: number) {
  if (rolling) return 'Rolling…';
  if (remainingSeconds > 0) return `Roll in ${remainingSeconds}`;
  return 'Roll';
}

export function useRollCooldown(durationSeconds: number) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (remainingSeconds === 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => clearInterval(timer);
  }, [remainingSeconds]);

  const start = useCallback(() => setRemainingSeconds(durationSeconds), [durationSeconds]);
  const reset = useCallback(() => setRemainingSeconds(0), []);

  return { remainingSeconds, start, reset };
}
