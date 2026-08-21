import { spacing } from './spacing';

/**
 * Optical placement for controls anchored to the bottom geometry of a phone.
 *
 * These are semantic geometry tokens, not general spacing aliases. Rounded
 * device corners and the home indicator mean equal numeric padding does not
 * produce equal-looking gaps.
 */
export const bottomDockGeometry = {
  phoneFloating: {
    inlineGap: spacing.xl,
    contentGap: spacing.md,
    minimumBottomGap: spacing.lg + spacing.xs,
    safeAreaLiftRatio: 0.5,
    safeAreaBottomAdjustment: spacing.xs,
  },
  drawerAction: {
    inlineGap: spacing.xl,
    contentGap: spacing.md,
    minimumBottomGap: spacing.lg + spacing.xs,
  },
  drawerFloatingAction: {
    inlineGap: spacing['2xl'],
    bottomGap: spacing['2xl'],
    contentGap: spacing.md,
  },
} as const;

export type BottomDockPlacement = keyof typeof bottomDockGeometry;
