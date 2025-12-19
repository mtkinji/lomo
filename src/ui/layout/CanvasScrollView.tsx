import type { PropsWithChildren } from 'react';
import React from 'react';
import { ScrollView, StyleSheet, type ScrollViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CanvasScrollViewProps = PropsWithChildren<
  ScrollViewProps & {
    /**
     * Adds safe-area bottom padding so the last row can scroll above the home indicator.
     * Defaults to true for standard canvases.
     */
    includeSafeAreaBottom?: boolean;
    /**
     * Extra bottom padding (in addition to any paddingBottom already present in contentContainerStyle).
     * Defaults to 0 so screens keep their own design spacing while still gaining safe-area padding.
     */
    extraBottomPadding?: number;
  }
>;

export const CanvasScrollView = React.forwardRef<ScrollView, CanvasScrollViewProps>(function CanvasScrollView(
  {
    children,
    style,
    contentContainerStyle,
    includeSafeAreaBottom = true,
    extraBottomPadding = 0,
    automaticallyAdjustKeyboardInsets = true,
    ...props
  },
  ref,
) {
  // Keyboard behavior guidance:
  // - `docs/keyboard-input-safety-implementation.md`
  // - `docs/prds/keyboard-input-safety-prd.md`
  const insets = useSafeAreaInsets();

  const flat = StyleSheet.flatten(contentContainerStyle) as ViewStyle | undefined;
  const existingPaddingBottom = typeof flat?.paddingBottom === 'number' ? flat.paddingBottom : 0;
  const safePadding = includeSafeAreaBottom ? insets.bottom : 0;

  return (
    <ScrollView
      {...props}
      ref={ref}
      automaticallyAdjustKeyboardInsets={automaticallyAdjustKeyboardInsets}
      style={[styles.container, style]}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: existingPaddingBottom + extraBottomPadding + safePadding },
      ]}
    >
      {children}
    </ScrollView>
  );
});

CanvasScrollView.displayName = 'CanvasScrollView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});


