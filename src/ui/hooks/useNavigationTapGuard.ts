import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';

type NavigationTapGuardOptions = {
  cooldownMs?: number;
  resetOnFocus?: boolean;
};

export function useNavigationTapGuard(options: NavigationTapGuardOptions = {}) {
  const { cooldownMs = 2000, resetOnFocus = true } = options;
  const isFocused = useIsFocused();
  const lastNavAtMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (resetOnFocus && isFocused) {
      lastNavAtMsRef.current = null;
    }
  }, [isFocused, resetOnFocus]);

  return useCallback(() => {
    const nowMs = Date.now();
    const lastMs = lastNavAtMsRef.current;
    if (lastMs && nowMs - lastMs < cooldownMs) {
      return false;
    }
    lastNavAtMsRef.current = nowMs;
    return true;
  }, [cooldownMs]);
}

