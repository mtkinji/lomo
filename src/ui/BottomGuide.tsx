import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../theme';
import { cardElevation, cardSurfaceStyle } from '../theme/surfaces';
import { KwiltBottomSheet } from './BottomSheet';

interface BottomGuideProps {
  visible: boolean;
  /**
   * Optional callback when the guide is dismissed, either via a swipe gesture
   * or programmatically. When provided, callers should use this to flip
   * `visible` to `false`.
   */
  onClose?: () => void;
  /**
   * Main content for the guide card rendered near the bottom of the canvas.
   * Typically includes a title, supporting copy, and primary / secondary
   * actions.
   */
  children: ReactNode;
}

/**
 * Lightweight, page-level guide card that hugs the bottom of the current
 * screen. Implemented as a "bottom-sheet-lite" so it slides up and down
 * from the bottom without fading opacity or dimming the underlying canvas.
 */
export function BottomGuide({ visible, onClose, children }: BottomGuideProps) {
  return (
    <KwiltBottomSheet
      visible={visible}
      onClose={onClose ?? (() => {})}
      // Let content define its own height so the guide feels like a compact,
      // anchored panel instead of a full-height sheet. Use a modest percentage
      // height so the guide remains compact and non-modal.
      snapPoints={['35%']}
      // Keep the app shell + canvas fully visible and interactive; this guide
      // should feel like a foreground hint, not a blocking modal.
      hideBackdrop
      // Use a transparent modal surface so only the guide card itself is
      // visible; the sheet's own background is handled by our card styling.
      backgroundStyle={styles.sheetBackground}
    >
      <View style={styles.container} pointerEvents="box-none">
        <View style={styles.card}>{children}</View>
      </View>
    </KwiltBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  container: {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    // Keep a slim x-small gutter from the screen edges so the guide feels
    // anchored to the shell without touching the phone bezels.
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  card: {
    // Start from the shared card surface so the guide feels like a hero
    // overlay rather than inline content.
    ...cardSurfaceStyle,
    ...cardElevation.raised,
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    rowGap: spacing.sm,
  },
});
