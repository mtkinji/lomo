import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { cardElevation, colors, spacing, typography } from '../theme';
import { Text } from './primitives';

export type ToastVariant = 'default' | 'success' | 'warning' | 'credits';

export function Toast(props: {
  visible: boolean;
  message: string;
  bottomOffset?: number;
  variant?: ToastVariant;
  durationMs?: number;
  onDismiss?: () => void;
}) {
  const {
    visible,
    message,
    bottomOffset = spacing.lg,
    variant = 'default',
    durationMs = 3000,
    onDismiss,
  } = props;

  const trimmed = message.trim();
  const shouldBeVisible = visible && trimmed.length > 0;

  const [shouldRender, setShouldRender] = useState(shouldBeVisible);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  const palette = useMemo(() => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: colors.pine700,
          borderColor: colors.pine800,
          textColor: colors.parchment,
        };
      case 'warning':
        return {
          backgroundColor: colors.turmeric700,
          borderColor: colors.turmeric800,
          textColor: colors.parchment,
        };
      case 'credits':
        return {
          backgroundColor: colors.turmeric700,
          borderColor: colors.turmeric800,
          textColor: colors.parchment,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.indigo800,
          borderColor: colors.indigo900,
          textColor: colors.primaryForeground,
        };
    }
  }, [variant]);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }

    if (shouldBeVisible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      if (onDismiss) {
        dismissTimeoutRef.current = setTimeout(() => {
          onDismiss?.();
        }, Math.max(0, durationMs));
      }
      return;
    }

    if (!shouldRender) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 14,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setShouldRender(false);
    });
  }, [durationMs, onDismiss, opacity, shouldBeVisible, shouldRender, translateY]);

  if (!shouldRender) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { bottom: bottomOffset }]}>
      <Animated.View
        style={[
          styles.surface,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={[styles.label, { color: palette.textColor }]}>{trimmed}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  surface: {
    maxWidth: 520,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    // Toasts should read as a true overlay (stronger than the chat composer).
    ...cardElevation.overlay,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 34,
    elevation: 14,
  },
  label: {
    ...typography.body,
    textAlign: 'center',
  },
});


