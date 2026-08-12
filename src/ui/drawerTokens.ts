import { radii, spacing } from '../theme';

/**
 * Component-owned anatomy for Kwilt bottom drawers.
 *
 * These values belong to the drawer family rather than the global spacing
 * scale: callers should select a named drawer chrome instead of rebuilding the
 * handle region from local padding overrides.
 */
export const bottomDrawerChromeTokens = {
  standard: {
    surfacePaddingTop: 0,
    handleRegionPaddingTop: spacing.sm,
    handleRegionPaddingBottom: spacing.xs,
    handleWidth: 64,
    handleHeight: 5,
    handleRadius: radii.pill,
    titleVariant: 'sm' as const,
  },
} as const;
