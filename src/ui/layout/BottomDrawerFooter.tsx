import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

type Props = {
  children: ReactNode;
  /**
   * Extra style overrides for the footer container.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Override the base background color (defaults to canvas).
   */
  backgroundColor?: string;
  /**
   * Override the top border color (defaults to theme border).
   */
  borderColor?: string;
  /**
   * When true, draws a subtle hairline divider at the top of the footer.
   * Defaults to false (no divider).
   */
  showTopBorder?: boolean;
  /**
   * Override base horizontal padding (defaults to `spacing.lg`).
   */
  paddingHorizontal?: number;
  /**
   * Override base top padding (defaults to `spacing.md`).
   */
  paddingTop?: number;
  /**
   * Override base bottom padding *before* safe-area inset is applied.
   * Actual paddingBottom becomes `max(paddingBottom, insets.bottom)`.
   */
  paddingBottom?: number;
};

/**
 * Canonical sticky footer for BottomDrawers.
 * - Sits below a scroll view (fixed).
 * - Includes a subtle top divider.
 * - Safe-area aware on iOS devices with a home indicator.
 */
export function BottomDrawerFooter({
  children,
  style,
  backgroundColor = colors.canvas,
  borderColor = colors.border,
  showTopBorder = false,
  paddingHorizontal = spacing.lg,
  paddingTop = spacing.md,
  paddingBottom = 0,
}: Props) {
  const insets = useSafeAreaInsets();
  const resolvedPaddingBottom = Math.max(paddingBottom, insets.bottom);

  return (
    <View
      style={[
        showTopBorder
          ? {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: borderColor,
            }
          : null,
        {
          backgroundColor,
          paddingHorizontal,
          paddingTop,
          paddingBottom: resolvedPaddingBottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}


