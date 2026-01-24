import { spacing } from '../theme';

/**
 * Shared geometry constants for the floating bottom bar so other UI (e.g. Quick Add)
 * can position itself above it without hard-coding values in multiple places.
 */
export const KWILT_BOTTOM_BAR_FLOATING_SIZE_PX = 56;
export const KWILT_BOTTOM_BAR_BOTTOM_OFFSET_PX = spacing.xl;

/**
 * Total vertical space from the bottom of the screen up to the top of the bottom bar.
 * i.e. bottom offset + bar height.
 */
export const KWILT_BOTTOM_BAR_RESERVED_HEIGHT_PX =
  KWILT_BOTTOM_BAR_BOTTOM_OFFSET_PX + KWILT_BOTTOM_BAR_FLOATING_SIZE_PX;


