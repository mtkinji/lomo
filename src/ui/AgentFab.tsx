import { ReactNode } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { Icon } from './Icon';
import { Logo } from './Logo';

export interface AgentFabProps {
  onPress: () => void;
  /**
   * Optional accessible label. This is used for screen readers only; the
   * visual FAB renders as an icon-only circle while branding is in flux.
   */
  accessibilityLabel?: string;
  icon?: ReactNode;
}

export function AgentFab({
  onPress,
  accessibilityLabel = 'Open coach',
  icon,
}: AgentFabProps) {
  const insets = useSafeAreaInsets();

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
            // Match the tokenized AI button gradient for consistent AI branding.
            colors={[colors.aiGradientStart, colors.aiGradientEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.fabCircle}
          >
            <View style={styles.logoStack}>
              {/* Pine green logo mark in a lighter tone so it sits inside the FAB */}
              <Logo size={32} variant="white" />
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    zIndex: 100,
  },
  fabShadow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    // Shadow + border live on an outer wrapper so the gradient can fill the
    // inner circle cleanly.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
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
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStack: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});


