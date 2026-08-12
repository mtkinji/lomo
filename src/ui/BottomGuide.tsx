import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { cardElevation, cardSurfaceStyle } from '../theme/surfaces';
import type { BottomDrawerSnapPoint } from './BottomDrawer';
import { BottomDrawer } from './BottomDrawer';
import { useToastStore } from '../store/useToastStore';

interface BottomGuideProps {
  visible: boolean;
  /**
   * When true (default), the guide will lift above the keyboard via BottomDrawer's
   * KeyboardAvoidingView wrapper.
   *
   * Set to false when the guide implements its own keyboard strategy (e.g. custom
   * snap points + internal padding) to avoid double offsets / awkward jumps.
   */
  keyboardAvoidanceEnabled?: boolean;
  /**
   * Optional snap points override when a guide needs more vertical space.
   * Defaults to a compact 35% guide height.
   */
  snapPoints?: BottomDrawerSnapPoint[];
  /**
   * Whether to dim the underlying canvas to make the guide more noticeable.
   * - 'none' (default): no scrim; guide feels like a lightweight overlay.
   * - 'light': subtle scrim to draw attention without feeling like a blocking modal.
   */
  scrim?: 'none' | 'light';
  /**
   * Layout style for the guide surface.
   * - 'inset' (default): small horizontal gutter so the guide reads like a card.
   * - 'floating': equal left, right, and bottom clearance from the screen edge.
   * - 'fullWidth': edge-to-edge drawer surface.
   */
  layout?: 'inset' | 'floating' | 'fullWidth';
  /**
   * Accent color used for guide affordances (handle). Defaults to `colors.border`.
   * This lets us unify the visual language across Coachmarks/Guides (e.g. turmeric).
   */
  guideColor?: string;
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
  /**
   * When true, the guide will shrink-to-fit its rendered content (up to the
   * max height implied by `snapPoints`). Useful for variable-height content
   * like GIFs.
   */
  dynamicSizing?: boolean;
}

/**
 * Lightweight, page-level guide card that hugs the bottom of the current
 * screen. Implemented as a "bottom-sheet-lite" so it slides up and down
 * from the bottom without fading opacity or dimming the underlying canvas.
 */
export function BottomGuide({
  visible,
  keyboardAvoidanceEnabled = true,
  snapPoints,
  scrim = 'none',
  layout = 'inset',
  guideColor,
  onClose,
  children,
  dynamicSizing = false,
}: BottomGuideProps) {
  const suppressionKeyRef = useRef(
    `bottomGuide-${Math.random().toString(36).slice(2)}-${Date.now()}`,
  );

  useEffect(() => {
    const key = suppressionKeyRef.current;
    useToastStore.getState().setToastsSuppressed({ key, suppressed: visible });
    return () => {
      useToastStore.getState().setToastsSuppressed({ key, suppressed: false });
    };
  }, [visible]);

  /**
   * A guide without a scrim is a lightweight, non-blocking overlay on top of the
   * current canvas. A visible scrim carries modal interaction semantics: it must
   * intercept touches so users cannot navigate a visually disabled page.
   *
   * `BottomDrawer` owns both the scrim and its touch-capturing backdrop so those
   * visual and interaction states cannot drift apart.
   */
  const shouldHideBackdrop = scrim === 'none';
  const canDismiss = Boolean(onClose);
  const accent = guideColor ?? colors.border;

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose ?? (() => {})}
      keyboardAvoidanceEnabled={keyboardAvoidanceEnabled}
      // Let content define its own height so the guide feels like a compact,
      // anchored panel instead of a full-height sheet. Use a modest percentage
      // height so the guide remains compact and non-modal.
      snapPoints={snapPoints ?? ['35%']}
      hideBackdrop={shouldHideBackdrop}
      scrimToken={scrim === 'light' ? 'pineSubtle' : 'default'}
      dismissOnBackdropPress={!shouldHideBackdrop && canDismiss}
      dismissable={canDismiss}
      // Guides should be easy to dismiss with a short swipe, otherwise the handle feels misleading.
      dismissDragThresholdRatio={0.16}
      // Render inline so the guide sits inside the current canvas layer and can
      // remain non-blocking when it does not have a scrim.
      presentation="inline"
      // Style the drawer surface itself as the guide card so it reads as a drawer
      // (clear background + border + subtle handle), while still living in the
      // canvas layer.
      sheetStyle={[
        styles.sheetSurface,
        layout === 'floating' && styles.sheetSurfaceFloating,
        layout === 'fullWidth' && styles.sheetSurfaceFullWidth,
      ]}
      handleContainerStyle={styles.handleContainer}
      handleStyle={canDismiss ? [styles.handle, { backgroundColor: accent }] : styles.handleHidden}
      // Let users swipe down anywhere on the guide card to dismiss.
      enableContentPanningGesture={canDismiss}
      dynamicSizing={dynamicSizing}
    >
      <View style={styles.content}>{children}</View>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheetSurface: {
    // Start from our shared card surface so the guide reads as a foreground drawer.
    ...cardSurfaceStyle,
    ...cardElevation.raised,
    backgroundColor: colors.card,
    borderRadius: radii.sheet,
    // Create a slim gutter from the screen edge so the guide doesn't touch bezels.
    // Leave enough room for the raised shadow to render instead of being clipped
    // by the left and right edges of the portal canvas.
    marginHorizontal: spacing.md,
    // Use roomy internal padding for the guide content.
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  sheetSurfaceFloating: {
    borderRadius: radii.deviceSheet + spacing.xs,
    marginBottom: spacing.md,
  },
  sheetSurfaceFullWidth: {
    marginHorizontal: 0,
    borderRadius: 0,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
  },
  handleContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 56,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: colors.border,
    opacity: 0.8,
  },
  handleHidden: {
    width: 0,
    height: 0,
    opacity: 0,
  },
  content: {
    rowGap: spacing.sm,
  },
});
