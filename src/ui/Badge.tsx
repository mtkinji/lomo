import type { ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Badge as ReusableBadge } from '@/components/ui/badge';
import type { BadgeProps as ReusableBadgeProps } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { colors, spacing, typography } from '../theme';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'info';

type BadgeProps = {
  /**
   * High-level visual variant used throughout the app.
   * `info` is preserved for backwards compatibility and maps to the
   * Reusables `secondary` badge under the hood.
   */
  variant?: BadgeVariant;
  /**
   * Content to render inside the badge. Strings/numbers are
   * automatically wrapped in the shared `Text` component so they
   * render correctly on native.
   */
  children: ReactNode;
  /**
   * Optional React Native style override applied to the underlying
   * badge container.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional text style override applied when children are rendered
   * as plain text.
   */
  textStyle?: StyleProp<TextStyle>;
} & Omit<ReusableBadgeProps, 'variant' | 'style' | 'children'>;

function mapVariantToReusable(variant?: BadgeVariant): ReusableBadgeProps['variant'] {
  if (!variant) return undefined;
  if (variant === 'info') return 'secondary';
  return variant;
}

const NATIVE_BACKGROUND_BY_VARIANT: Record<BadgeVariant, string> = {
  default: colors.accent,
  secondary: colors.shellAlt,
  destructive: colors.destructive,
  outline: colors.canvas,
  info: colors.accentMuted,
};

const NATIVE_TEXT_BY_VARIANT: Record<BadgeVariant, string> = {
  default: colors.canvas,
  secondary: colors.textSecondary,
  destructive: colors.canvas,
  outline: colors.textPrimary,
  info: colors.canvas,
};

export function Badge({
  variant = 'default',
  children,
  style,
  textStyle,
  ...rest
}: BadgeProps) {
  const nativeContainerStyle: StyleProp<ViewStyle> =
    Platform.OS === 'web'
      ? style
      : [
          styles.nativeBase,
          {
            backgroundColor: NATIVE_BACKGROUND_BY_VARIANT[variant],
          },
          style,
        ];

  const content =
    typeof children === 'string' || typeof children === 'number' ? (
      <Text
        style={[
          styles.nativeText,
          Platform.OS !== 'web' && { color: NATIVE_TEXT_BY_VARIANT[variant] },
          textStyle,
        ]}
      >
        {children}
      </Text>
    ) : (
      children
    );

  return (
    <ReusableBadge
      {...rest}
      variant={mapVariantToReusable(variant)}
      // Preserve React Native visual fallback while still allowing
      // Reusables / NativeWind to drive styling via className.
      style={nativeContainerStyle}
    >
      {content}
    </ReusableBadge>
  );
}

const styles = StyleSheet.create({
  nativeBase: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    // 6px radius to match app badge visual spec.
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  nativeText: {
    ...typography.bodySm,
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
  },
});


