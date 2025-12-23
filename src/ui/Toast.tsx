import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { cardElevation, colors, spacing, typography } from '../theme';
import { Text } from './primitives';
import { Icon } from './Icon';

export type ToastVariant = 'default' | 'success' | 'warning' | 'danger' | 'credits';

export function Toast(props: {
  visible: boolean;
  message: string;
  bottomOffset?: number;
  variant?: ToastVariant;
  durationMs?: number;
  actionLabel?: string;
  onPressAction?: () => void;
  onDismiss?: () => void;
}) {
  const {
    visible,
    message,
    bottomOffset = spacing.lg,
    variant = 'default',
    durationMs = 3000,
    actionLabel,
    onPressAction,
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
          icon: 'check' as const,
        };
      case 'warning':
        return {
          backgroundColor: colors.turmeric700,
          borderColor: colors.turmeric800,
          textColor: colors.parchment,
          icon: 'warning' as const,
        };
      case 'danger':
        return {
          backgroundColor: colors.destructive,
          borderColor: colors.madder800,
          textColor: colors.destructiveForeground,
          icon: 'danger' as const,
        };
      case 'credits':
        return {
          backgroundColor: colors.turmeric700,
          borderColor: colors.turmeric800,
          textColor: colors.parchment,
          icon: 'sparkles' as const,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.indigo800,
          borderColor: colors.indigo900,
          textColor: colors.primaryForeground,
          icon: 'info' as const,
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

  const canShowAction = typeof actionLabel === 'string' && actionLabel.trim().length > 0 && typeof onPressAction === 'function';

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: bottomOffset }]}>
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
        <View style={styles.row}>
          <View style={styles.left}>
            <Icon name={palette.icon} size={20} color={palette.textColor} />
          </View>

          <View style={styles.content}>
            <Text style={[styles.label, { color: palette.textColor }]} numberOfLines={2}>
              {trimmed}
            </Text>
          </View>

          {canShowAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel.trim()}
              onPress={() => {
                try {
                  onPressAction?.();
                } finally {
                  onDismiss?.();
                }
              }}
              style={styles.actionButton}
            >
              <Text style={[styles.actionLabel, { color: palette.textColor }]} numberOfLines={1}>
                {actionLabel.trim()}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            onPress={() => onDismiss?.()}
            hitSlop={12}
            style={styles.closeButton}
          >
            <Icon name="close" size={18} color={palette.textColor} />
          </Pressable>
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
  },
  left: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minHeight: 22,
    justifyContent: 'center',
  },
  label: {
    ...typography.body,
    textAlign: 'left',
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  actionLabel: {
    ...typography.bodySm,
    fontWeight: '700',
  },
  closeButton: {
    paddingLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
});


