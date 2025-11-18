import { ReactNode } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
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
} & TouchableOpacityProps;

export function Button({
  variant = 'default',
  size = 'default',
  style,
  children,
  disabled,
  ...rest
}: Props) {
  const variantStyle = stylesByVariant[variant];

  return (
    <TouchableOpacity
      {...rest}
      activeOpacity={variant === 'link' ? 0.7 : 0.85}
      disabled={disabled}
      style={[
        styles.base,
        size === 'icon'
          ? styles.iconSize
          : size === 'small'
          ? styles.smallSize
          : styles.defaultSize,
        variantStyle,
        disabled && styles.disabled,
        style,
        variant === 'link' && styles.linkBase,
      ]}
    >
      {variant === 'ai' && (
        <LinearGradient
          pointerEvents="none"
          colors={['#166534', '#22C55E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiGradientOverlay}
        />
      )}
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
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
    backgroundColor: '#18181B', // shadcn primary
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  secondary: {
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
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

