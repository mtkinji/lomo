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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type BottomDrawerProps = {
  visible: boolean;
  onClose: () => void;
  heightRatio?: number; // 0-1
  dismissDistance?: number;
  dismissDuration?: number;
  children: ReactNode;
};

export function BottomDrawer({
  visible,
  onClose,
  heightRatio = 0.85,
  dismissDistance = 400,
  dismissDuration = 250,
  children,
}: BottomDrawerProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const slide = useRef(new Animated.Value(visible ? 0 : 1)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
    Animated.timing(slide, {
      toValue: visible ? 0 : 1,
      duration: dismissDuration,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (!visible) {
        setMounted(false);
      }
    });
  }, [slide, visible]);

  const translateY = Animated.add(
    slide.interpolate({
      inputRange: [0, 1],
      outputRange: [0, dismissDistance],
    }),
    dragOffset
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            dragOffset.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > dismissDistance * 0.35 || gestureState.vy > 0.9) {
            Animated.timing(dragOffset, {
              toValue: dismissDistance,
              duration: 150,
              useNativeDriver: true,
            }).start(() => {
              dragOffset.setValue(0);
              onClose();
            });
          } else {
            Animated.spring(dragOffset, {
              toValue: 0,
              tension: 170,
              friction: 18,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragOffset, {
            toValue: 0,
            tension: 170,
            friction: 18,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dismissDistance, dragOffset, onClose]
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.sheet,
                {
                  paddingBottom: spacing.lg + insets.bottom,
                  minHeight: `${heightRatio * 100}%`,
                  transform: [{ translateY }],
                },
              ]}
            >
              <View style={styles.handle} />
              {children}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // Dim with a Pine-tinted veil to keep brand color present
    backgroundColor: 'rgba(31,82,38,0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  handle: {
    backgroundColor: colors.border,
    width: 64,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
});


