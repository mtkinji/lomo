import { bottomDockGeometry, spacing } from '../../theme';

/** Shared resting geometry for the pre-selected floating composer surface. */
export const RESTING_COMPOSER_HORIZONTAL_INSET_PX =
  bottomDockGeometry.restingFloatingControl.inlineGap;
export const RESTING_COMPOSER_HEIGHT_PX = 48;
export const RESTING_COMPOSER_BOTTOM_GAP_PX = spacing.sm;
/** Resting offset used by inventory controls when the global bottom bar is absent. */
export const RESTING_COMPOSER_COMPACT_BOTTOM_OFFSET_PX =
  bottomDockGeometry.restingFloatingControl.bottomGap;
