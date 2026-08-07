import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';

export function useCookModeOrientation() {
  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => {
        void ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
      });

      return () => cancelAnimationFrame(frame);
    }, []),
  );
}
