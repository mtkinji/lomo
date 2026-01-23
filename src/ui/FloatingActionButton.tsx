import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { typography } from '../theme/typography';
import { Text } from './Typography';

export interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  icon: ReactNode;
  badgeCount?: number;
}

/**
 * Lightweight FAB for primary creation actions.
 * Intentionally matches the existing "floating" treatment used elsewhere (size, shadow, position).
 */
function formatBadgeCount(count: number) {
  if (count > 99) return '99+';
  return String(count);
}

export function FloatingActionButton({
  onPress,
  accessibilityLabel,
  icon,
  badgeCount,
}: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  const showBadge = typeof badgeCount === 'number' && badgeCount > 0;

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + spacing.lg }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => (pressed ? styles.buttonPressed : undefined)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.fabShadow}>
          <LinearGradient
            colors={[colors.aiGradientStart, colors.aiGradientEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.fabCircle}
          >
            <View style={styles.iconContainer}>{icon}</View>
          </LinearGradient>
          {showBadge ? (
            <View style={styles.badge} pointerEvents="none">
              <Text style={styles.badgeText}>{formatBadgeCount(badgeCount)}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const FAB_SIZE = 56;
const FAB_RADIUS = FAB_SIZE / 2;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    zIndex: 100,
  },
  fabShadow: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_RADIUS,
    // Shadow + border live on an outer wrapper so the gradient can fill the
    // inner circle cleanly.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.aiBorder,
    alignItems: 'center',
    justifyContent: 'center',
    // Stronger "floating" shadow so this clearly reads as a FAB.
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabCircle: {
    width: '100%',
    height: '100%',
    borderRadius: FAB_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.caption,
    color: colors.primaryForeground,
    fontWeight: '700',
    includeFontPadding: false,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});


