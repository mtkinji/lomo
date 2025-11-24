import { ReactNode } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../theme';

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'accent' | 'ai';
type ButtonSize = 'default' | 'small' | 'icon';

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Optional override for circular icon buttons.
   * When provided, sets width/height/borderRadius to this value.
   */
  iconButtonSize?: number;
} & TouchableOpacityProps;

export function Button({
  variant = 'default',
  size = 'default',
  style,
  children,
  disabled,
  iconButtonSize,
  ...rest
}: Props) {
  const variantStyle = stylesByVariant[variant];

  const sizeStyle =
    size === 'icon'
      ? [
          styles.iconSize,
          iconButtonSize
            ? {
                width: iconButtonSize,
                height: iconButtonSize,
                borderRadius: iconButtonSize / 2,
              }
            : null,
        ]
      : size === 'small'
      ? styles.smallSize
      : styles.defaultSize;

  return (
    <TouchableOpacity
      {...rest}
      activeOpacity={variant === 'link' ? 0.7 : 0.85}
      disabled={disabled}
      style={[
        styles.base,
        sizeStyle,
        variantStyle,
        disabled && styles.disabled,
        style,
        variant === 'link' && styles.linkBase,
      ]}
    >
      {variant === 'ai' && (
        <View pointerEvents="none" style={styles.aiGradientOverlay}>
          <LinearGradient
            colors={['#166534', '#22C55E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      )}
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    // Match shadcn's default radius (non-pill) for all non-icon buttons
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  defaultSize: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  smallSize: {
    // Match the visual thickness of the 36x36 "+" icon button on Arcs
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.lg,
    minHeight: 36,
  },
  iconSize: {
    width: 44,
    height: 44,
    borderRadius: 999,
    padding: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  linkBase: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  aiGradientOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

const stylesByVariant: Record<ButtonVariant, ViewStyle> = {
  default: {
    // ShadCN-style primary button
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondary: {
    // Neutral "white primary" surface, useful on shell backgrounds
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  link: {
    backgroundColor: 'transparent',
  },
  // Accent: Pine brand color, available but opt-in
  accent: {
    backgroundColor: colors.accent,
  },
  // AI: lighter Pine-tinted surface for AI / guidance flows
  ai: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
};

