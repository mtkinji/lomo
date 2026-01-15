import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Text } from '@/src/ui/Typography';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'info';

type BadgeProps = {
  /**
   * High-level visual variant used throughout the app.
   */
  variant?: BadgeVariant;
  /**
   * Content to render inside the badge. Strings/numbers are
   * automatically wrapped in the shared `Text` component.
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
};

const BACKGROUND_BY_VARIANT: Record<BadgeVariant, string> = {
  default: colors.primary,
  secondary: colors.shellAlt,
  destructive: colors.destructive,
  outline: colors.canvas,
  info: colors.accentMuted,
};

const TEXT_COLOR_BY_VARIANT: Record<BadgeVariant, string> = {
  default: colors.primaryForeground,
  secondary: colors.textSecondary,
  destructive: colors.canvas,
  outline: colors.textPrimary,
  info: colors.canvas,
};

const BORDER_BY_VARIANT: Record<BadgeVariant, { borderWidth: number; borderColor: string } | undefined> = {
  default: undefined,
  secondary: undefined,
  destructive: undefined,
  outline: { borderWidth: 1, borderColor: colors.border },
  info: undefined,
};

export function Badge({
  variant = 'default',
  children,
  style,
  textStyle,
}: BadgeProps) {
  const containerStyle = [
    styles.base,
    {
      backgroundColor: BACKGROUND_BY_VARIANT[variant],
    },
    BORDER_BY_VARIANT[variant],
    style,
  ];

  const content =
    typeof children === 'string' || typeof children === 'number' ? (
      <Text
        style={[
          styles.text,
          { color: TEXT_COLOR_BY_VARIANT[variant] },
          textStyle,
        ]}
      >
        {children}
      </Text>
    ) : (
      children
    );

  return <View style={containerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    // 6px radius to match app badge visual spec.
    borderRadius: 6,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.bodySm,
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
  },
});
