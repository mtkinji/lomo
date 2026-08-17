import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomDockGeometry, colors } from '../../theme';
import { useBottomDrawerParentActionInsets } from '../BottomDrawer';
import {
  resolveDrawerActionBottomPadding,
  resolveDrawerActionInlinePadding,
} from './bottomDockGeometry';

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
}: Props) {
  const insets = useSafeAreaInsets();
  const parentInsets = useBottomDrawerParentActionInsets();
  const resolvedPaddingBottom = resolveDrawerActionBottomPadding(
    parentInsets.bottom,
    insets.bottom,
  );

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
          paddingHorizontal: resolveDrawerActionInlinePadding(parentInsets.inline),
          paddingTop: bottomDockGeometry.drawerAction.contentGap,
          paddingBottom: resolvedPaddingBottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
