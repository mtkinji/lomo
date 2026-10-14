import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/** Current time used to expire and regenerate visible Plan recommendations. */
export function usePlanClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []));
  return now;
}
