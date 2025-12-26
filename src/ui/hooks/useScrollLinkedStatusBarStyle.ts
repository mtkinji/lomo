import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';

type StatusBarStyle = 'light' | 'dark';

export type ScrollLinkedStatusBarOptions = {
  /**
   * When false, the hook will not subscribe to scroll changes and will return `inactiveStyle`.
   * Useful for gating updates to the currently focused screen.
   */
  enabled?: boolean;
  /**
   * Style to return when `enabled` is false.
   */
  inactiveStyle?: StatusBarStyle;
  /**
   * Initial style to return before the first scroll event is observed.
   */
  initialStyle?: StatusBarStyle;
  /**
   * Prevent flicker around the threshold by requiring the scroll position to cross
   * threshold ± hysteresis before switching styles.
   */
  hysteresisPx?: number;
  /**
   * Optional: Only apply dynamic style on a specific platform.
   * Defaults to iOS only, since this is primarily for iOS status bar readability.
   */
  platform?: 'ios' | 'android' | 'all';
};

export function useScrollLinkedStatusBarStyle(
  scrollY: Animated.Value,
  thresholdY: number,
  {
    enabled = true,
    inactiveStyle = 'dark',
    initialStyle = 'light',
    hysteresisPx = 12,
    platform = 'ios',
  }: ScrollLinkedStatusBarOptions = {},
): StatusBarStyle {
  const shouldRun = useMemo(() => {
    if (!enabled) return false;
    if (platform === 'all') return true;
    if (platform === 'ios') return Platform.OS === 'ios';
    return Platform.OS === 'android';
  }, [enabled, platform]);

  const [style, setStyle] = useState<StatusBarStyle>(shouldRun ? initialStyle : inactiveStyle);
  const styleRef = useRef<StatusBarStyle>(style);
  const thresholdRef = useRef<number>(thresholdY);

  useEffect(() => {
    thresholdRef.current = thresholdY;
  }, [thresholdY]);

  useEffect(() => {
    styleRef.current = style;
  }, [style]);

  useEffect(() => {
    if (!shouldRun) {
      setStyle(inactiveStyle);
      return;
    }

    // Sync initial state immediately using the current value if available.
    const current =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (scrollY as any).__getValue === 'function' ? (scrollY as any).__getValue() : 0;
    const threshold = thresholdRef.current;
    const nextInitial: StatusBarStyle =
      current >= threshold ? 'dark' : 'light';
    setStyle(nextInitial);

    const id = scrollY.addListener(({ value }) => {
      const t = thresholdRef.current;
      const h = hysteresisPx;
      const curr = styleRef.current;

      if (curr === 'light') {
        if (value >= t + h) {
          styleRef.current = 'dark';
          setStyle('dark');
        }
        return;
      }

      if (value <= t - h) {
        styleRef.current = 'light';
        setStyle('light');
      }
    });

    return () => {
      scrollY.removeListener(id);
    };
  }, [scrollY, shouldRun, inactiveStyle, hysteresisPx]);

  return style;
}


