import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export type AccessibilityPreferences = {
  reduceMotionEnabled: boolean;
  screenReaderEnabled: boolean;
};

export function getAccessibleAnimationDuration(
  durationMs: number,
  reduceMotionEnabled: boolean,
): number {
  return reduceMotionEnabled ? 0 : durationMs;
}

/**
 * Keeps shared surfaces aligned with the system accessibility preferences that
 * materially change their behavior. Defaults remain conservative until the
 * asynchronous native values resolve.
 */
export function useAccessibilityPreferences(): AccessibilityPreferences {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotionEnabled(enabled);
    });
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderEnabled(enabled);
    });

    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled,
    );

    return () => {
      mounted = false;
      reduceMotionSubscription.remove();
      screenReaderSubscription.remove();
    };
  }, []);

  return { reduceMotionEnabled, screenReaderEnabled };
}
