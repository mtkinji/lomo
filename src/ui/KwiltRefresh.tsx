import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  RefreshControl,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAccessibilityPreferences } from './hooks/useAccessibilityPreferences';

import {
  KWILT_REFRESH_COMPLETION_MS,
  KWILT_REFRESH_MINIMUM_MS,
  KwiltLoader,
  type KwiltLoaderPhase,
} from './KwiltLoader';

type UseKwiltRefreshOptions = {
  backgroundColor?: string;
  onRefresh: () => Promise<unknown> | unknown;
  overlayTopOffset?: number;
  progressViewOffset?: number;
  scrollY?: Animated.Value;
};

type KwiltRefreshFrameProps = {
  children: ReactNode;
  refreshOverlay: ReactNode;
  refreshing: boolean;
  style?: StyleProp<ViewStyle>;
};

const REFRESH_REVEAL_HEIGHT = 96;
export const KWILT_REFRESH_LOADING_CYCLE_MS = 2_000;

export function KwiltRefreshFrame({ children, refreshOverlay, refreshing, style }: KwiltRefreshFrameProps) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const foregroundOffset = useRef(new Animated.Value(0)).current;
  const foregroundMountedRef = useRef(false);

  useEffect(() => {
    const target = refreshing ? REFRESH_REVEAL_HEIGHT : 0;
    if (!foregroundMountedRef.current) {
      foregroundMountedRef.current = true;
      foregroundOffset.setValue(target);
      return;
    }
    if (reduceMotionEnabled) {
      foregroundOffset.setValue(target);
      return;
    }
    const animation = Animated.timing(foregroundOffset, {
      toValue: target,
      duration: refreshing ? 180 : 240,
      easing: refreshing ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [foregroundOffset, reduceMotionEnabled, refreshing]);

  return (
    <View style={[styles.frame, style]}>
      {refreshOverlay}
      <Animated.View
        testID="kwilt-refresh-foreground"
        style={[styles.foreground, { transform: [{ translateY: foregroundOffset }] }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export function useKwiltRefresh({
  backgroundColor,
  onRefresh,
  overlayTopOffset = 0,
  progressViewOffset,
  scrollY,
}: UseKwiltRefreshOptions) {
  const [phase, setPhase] = useState<KwiltLoaderPhase>('idle');
  const phaseRef = useRef<KwiltLoaderPhase>('idle');
  const cycleRef = useRef(0);
  const internalScrollY = useRef(new Animated.Value(0)).current;
  const trackedScrollY = scrollY ?? internalScrollY;
  const refreshStageHeight = REFRESH_REVEAL_HEIGHT + overlayTopOffset;

  useEffect(() => () => {
    cycleRef.current += 1;
  }, []);

  const runRefresh = useCallback(async () => {
    if (phaseRef.current !== 'idle') return;
    const cycle = ++cycleRef.current;
    phaseRef.current = 'loading';
    setPhase('loading');

    let refreshPromise: Promise<unknown>;
    try {
      refreshPromise = Promise.resolve(onRefresh());
    } catch {
      refreshPromise = Promise.resolve();
    }
    let refreshSettled = false;
    const guardedRefresh = refreshPromise
      .catch(() => undefined)
      .then(() => {
        refreshSettled = true;
      });

    while (cycleRef.current === cycle) {
      const loadingStartedAtMs = Date.now();
      await waitForPromiseOrTimeout(guardedRefresh, KWILT_REFRESH_LOADING_CYCLE_MS);
      const minimumRemainingMs = KWILT_REFRESH_MINIMUM_MS - (Date.now() - loadingStartedAtMs);
      if (minimumRemainingMs > 0) await waitForMs(minimumRemainingMs);
      if (cycleRef.current !== cycle) return;

      phaseRef.current = 'completing';
      setPhase('completing');
      await waitForMs(KWILT_REFRESH_COMPLETION_MS);
      if (cycleRef.current !== cycle) return;

      if (refreshSettled) {
        phaseRef.current = 'idle';
        setPhase('idle');
        return;
      }

      phaseRef.current = 'loading';
      setPhase('loading');
    }
  }, [onRefresh]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      colors={['transparent']}
      progressBackgroundColor="transparent"
      progressViewOffset={progressViewOffset}
      refreshing={phase !== 'idle'}
      tintColor="transparent"
      onRefresh={() => void runRefresh()}
    />
  ), [phase, progressViewOffset, runRefresh]);

  const pullOpacity = useMemo(() => trackedScrollY.interpolate({
    inputRange: [-REFRESH_REVEAL_HEIGHT, -8, 0],
    outputRange: [1, 0.18, 0],
    extrapolate: 'clamp',
  }), [trackedScrollY]);

  const onScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: trackedScrollY } } }],
    { useNativeDriver: Boolean(scrollY) },
  ), [scrollY, trackedScrollY]);

  const refreshOverlay = useMemo(() => (
    <View
      pointerEvents="none"
      testID="kwilt-refresh-overlay"
      style={[
        styles.overlay,
        { height: refreshStageHeight },
      ]}
    >
      {phase === 'idle' ? (
        <Animated.View
          testID="kwilt-refresh-pull"
          style={[
            styles.layer,
            { opacity: pullOpacity, paddingTop: overlayTopOffset },
            backgroundColor ? { backgroundColor } : null,
          ]}
        >
          <KwiltLoader phase="idle" size={50} />
        </Animated.View>
      ) : null}
      {phase !== 'idle' ? (
        <View
          testID="kwilt-refresh-active"
          style={[
            styles.layer,
            { paddingTop: overlayTopOffset },
            backgroundColor ? { backgroundColor } : null,
          ]}
        >
          <KwiltLoader phase={phase} size={50} />
        </View>
      ) : null}
    </View>
  ), [backgroundColor, overlayTopOffset, phase, pullOpacity, refreshStageHeight]);

  return {
    onScroll,
    refreshControl,
    refreshOverlay,
    refreshing: phase !== 'idle',
    scrollEventThrottle: 16 as const,
  };
}

function waitForMs(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function waitForPromiseOrTimeout(promise: Promise<unknown>, durationMs: number): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    promise,
    new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, durationMs);
    }),
  ]);
  if (timeout) clearTimeout(timeout);
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  foreground: {
    flex: 1,
    minHeight: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: REFRESH_REVEAL_HEIGHT,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
