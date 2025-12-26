import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Portal } from '@rn-primitives/portal';
import { colors, spacing } from '../theme';
import { useToastStore } from '../store/useToastStore';

export type BrandBackgroundColor =
  | 'shell'
  | 'shellAlt'
  | 'canvas'
  | 'card'
  | 'cardMuted'
  | 'accent'
  | 'pine300'
  | 'pine400'
  | 'accentRose'
  | 'accentRoseStrong'
  | 'indigo'
  | 'turmeric50'
  | 'turmeric100'
  | 'turmeric200'
  | 'turmeric300'
  | 'turmeric400'
  | 'turmeric500'
  | 'turmeric600'
  | 'turmeric700'
  | 'turmeric800'
  | 'turmeric900'
  | 'turmeric'
  | 'madder'
  | 'quiltBlue'
  | 'quiltBlue50'
  | 'quiltBlue100'
  | 'quiltBlue200'
  | 'quiltBlue300'
  | 'quiltBlue400'
  | 'quiltBlue500'
  | 'quiltBlue600'
  | 'quiltBlue700'
  | 'quiltBlue800'
  | 'quiltBlue900'
  | 'clay'
  | 'moss'
  | 'sumi';

export type FullScreenInterstitialTransition = 'none' | 'fade' | 'launch';

type TransitionConfig = {
  enterDurationMs?: number;
  exitDurationMs?: number;
};

interface FullScreenInterstitialProps {
  visible: boolean;
  onDismiss?: () => void;
  /**
   * Interstitial body content. Hosts are responsible for providing title,
   * copy, and any inline media.
   */
  children: ReactNode;
  /**
   * Background color for the interstitial card surface, mapped directly from
   * the tokenized `colors` palette. Defaults to `card`.
   */
  backgroundColor?: BrandBackgroundColor;
  /**
   * Optional style override for the inner content container (where `children` are rendered).
   * Useful when a caller wants full control over vertical spacing (e.g. pinned CTAs).
   */
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Progression model for how this moment should advance:
   * - 'button' – caller controls dismissal via explicit actions (default).
   * - a number – automatically calls `onDismiss` after N milliseconds when
   *   `visible` becomes true.
   */
  progression?: 'button' | number;
  /**
   * When true, renders inline instead of using the global Portal host.
   * Useful for displaying the interstitial inside a React Native `Modal`
   * where portal content would otherwise appear behind the modal layer.
   */
  withinModal?: boolean;
  /**
   * Optional entry/exit transition for this interstitial.
   *
   * - 'none' (default): preserves legacy behavior (mount/unmount instantly).
   * - 'fade': simple opacity fade in/out.
   * - 'launch': matches the in-app launch screen close (fade out + slight shrink + lift).
   */
  transition?: FullScreenInterstitialTransition;
  transitionConfig?: TransitionConfig;
}

/**
 * Generic full-screen interstitial overlay that sits on top of the current
 * app shell. Use this for one-off celebration or guidance moments that should
 * temporarily take over the main canvas.
 */
export function FullScreenInterstitial({
  visible,
  onDismiss,
  children,
  backgroundColor = 'card',
  contentStyle,
  progression = 'button',
  withinModal = false,
  transition = 'none',
  transitionConfig,
}: FullScreenInterstitialProps) {
  const surfaceBackground = colors[backgroundColor] ?? colors.card;
  const suppressionKeyRef = useRef(
    `fullScreenInterstitial-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  );

  useEffect(() => {
    const key = suppressionKeyRef.current;
    useToastStore.getState().setToastsSuppressed({ key, suppressed: visible });
    return () => {
      useToastStore.getState().setToastsSuppressed({ key, suppressed: false });
    };
  }, [visible]);

  const wantsTransition = transition !== 'none';
  const enterDurationMs = transitionConfig?.enterDurationMs ?? 240;
  const exitDurationMs = transitionConfig?.exitDurationMs ?? 280;

  // When transitions are enabled, keep the interstitial mounted long enough to
  // play the exit animation after `visible` flips false.
  const [isMounted, setIsMounted] = useState(visible);
  const isMountedRef = useRef(isMounted);
  useEffect(() => {
    isMountedRef.current = isMounted;
  }, [isMounted]);

  // Mirrors `LaunchScreen` animation structure so the "launch" preset can be shared.
  const introAnim = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;

  const transitionStyle = useMemo(() => {
    if (!wantsTransition) {
      return null;
    }

    const opacity = Animated.multiply(introAnim, exitAnim);

    if (transition === 'fade') {
      return { opacity };
    }

    // 'launch'
    const introTranslateY = introAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [10, 0],
    });
    const exitTranslateY = exitAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-30, 0],
    });
    const scale = exitAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1],
    });
    const translateY = Animated.add(introTranslateY, exitTranslateY);

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  }, [exitAnim, introAnim, transition, wantsTransition]);

  useEffect(() => {
    if (!wantsTransition) {
      return;
    }

    if (visible) {
      setIsMounted(true);
      introAnim.stopAnimation();
      exitAnim.stopAnimation();
      introAnim.setValue(0);
      exitAnim.setValue(1);

      Animated.timing(introAnim, {
        toValue: 1,
        duration: enterDurationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    introAnim.stopAnimation();
    exitAnim.stopAnimation();
    Animated.timing(exitAnim, {
      toValue: 0,
      duration: exitDurationMs,
      easing: transition === 'launch' ? Easing.bezier(0.78, 0, 1, 1) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [
    enterDurationMs,
    exitAnim,
    exitDurationMs,
    introAnim,
    transition,
    visible,
    wantsTransition,
  ]);

  useEffect(() => {
    if (!visible) return;
    // Interstitials are full-screen "moments" with no text input. If the user
    // navigates here from a screen that had a focused TextInput, iOS can keep
    // the keyboard open. Explicitly dismiss it on show.
    Keyboard.dismiss();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (typeof progression !== 'number') return;
    if (!onDismiss) return;

    const timeoutId = setTimeout(() => {
      onDismiss();
    }, progression);

    return () => clearTimeout(timeoutId);
  }, [visible, progression, onDismiss]);

  if (!wantsTransition) {
    if (!visible) return null;
  } else {
    if (!isMounted) return null;
  }

  const body = (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor: surfaceBackground },
        wantsTransition ? transitionStyle : null,
      ]}
      // Allow touches to pass through to children (buttons, etc.)
      pointerEvents="box-none"
    >
      <View
        style={[styles.content, contentStyle]}
        // Block interaction with the underlying screen; callers control dismissal
        // via explicit buttons or links inside `children`.
        pointerEvents="auto"
      >
        {children}
      </View>
    </Animated.View>
  );

  if (withinModal) {
    return body;
  }

  return <Portal name="full-screen-interstitial">{body}</Portal>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 0,
    paddingVertical: 0,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
});
