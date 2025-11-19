import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type BottomDrawerProps = {
  visible: boolean;
  onClose: () => void;
  heightRatio?: number; // 0-1
  dismissDistance?: number;
  dismissDuration?: number;
  /**
   * Whether tapping the dimmed backdrop should close the drawer.
   * This matches the common native-bottom-sheet behavior.
   */
  dismissOnBackdropPress?: boolean;
  children: ReactNode;
};

export function BottomDrawer({
  visible,
  onClose,
  heightRatio = 0.85,
  dismissDistance = 400,
  dismissDuration = 250,
  dismissOnBackdropPress = true,
  children,
}: BottomDrawerProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  // 0 = fully open, 1 = fully closed. This single "progress" value is driven
  // by both visibility transitions and the drag gesture so the motion feels
  // continuous and avoids the slight "pause" when switching between two
  // different animated values.
  const progress = useRef(new Animated.Value(visible ? 0 : 1)).current;

  useEffect(() => {
    if (visible) {
      if (!mounted) {
        setMounted(true);
      }
    }

    Animated.timing(progress, {
      toValue: visible ? 0 : 1,
      duration: dismissDuration,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (!visible) {
        setMounted(false);
      }
    });
  }, [dismissDuration, mounted, progress, visible]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, dismissDistance],
  });

  // Backdrop opacity tracks how "open" the sheet feels.
  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // This responder is attached only to the top "handle" grab region, so
        // it's safe to eagerly claim the gesture there.
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        // We don't rely on the non-capture move hook.
        onMoveShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderGrant: () => {
          // Stop any running open/close animation so the gesture can take over.
          progress.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            const ratio = Math.min(gestureState.dy / dismissDistance, 1);
            progress.setValue(ratio);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldDismiss =
            gestureState.dy > dismissDistance * 0.35 || gestureState.vy > 0.9;

          if (shouldDismiss) {
            // Continue the movement from the current drag position all the way
            // off-screen using the same progress value, so it feels like one
            // uninterrupted slide.
            Animated.timing(progress, {
              toValue: 1,
              duration: 180,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }).start(() => {
              setMounted(false);
              onClose();
            });
            return;
          }

          // Spring back to the open position when the gesture isn't strong
          // enough to dismiss, matching the "rubber-band" feel of native sheets.
          Animated.spring(progress, {
            toValue: 0,
            tension: 170,
            friction: 18,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(progress, {
            toValue: 0,
            tension: 170,
            friction: 18,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dismissDistance, onClose, progress]
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        {dismissOnBackdropPress && (
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        )}
        <Animated.View
          style={[
            styles.sheet,
            {
              // Only respect the device safe area at the bottom so the chat
              // input can sit as low as possible on screen.
              paddingBottom: insets.bottom,
              // Size the drawer relative to the viewport minus the top safe
              // area so a heightRatio of 1.0 brings the sheet up to the
              // bottom of the safe area (just under the status bar / notch).
              minHeight: heightRatio * Math.max(windowHeight - insets.top, 0),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleGrabRegion}>
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // Dim with a Pine-tinted veil to keep brand color present
    backgroundColor: 'rgba(6,24,13,0.85)',
    justifyContent: 'flex-end',
    // Let the sheet surface go edge-to-edge; inner padding is handled by `sheet`.
    paddingHorizontal: 0,
  },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    // Keep a slim 16px gutter from the screen edge so the chat canvas can feel
    // expansive while still not touching the bezels.
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  handleGrabRegion: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  handle: {
    backgroundColor: colors.border,
    width: 64,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
  },
});


