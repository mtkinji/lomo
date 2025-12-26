import { colors, fonts, spacing } from '../theme';

/**
 * Logical button sizes that control both container dimensions and typography.
 */
export type ButtonSizeToken = 'xs' | 'sm' | 'md' | 'lg';

export const BUTTON_SIZE_TOKENS: Record<
  ButtonSizeToken,
  {
    height: number;
    paddingHorizontal: number;
    paddingVertical: number;
    text: {
      fontFamily: string;
      fontSize: number;
      lineHeight: number;
    };
  }
> = {
  xs: {
    height: 32,
    // More generous horizontal padding to match the "ample margin" feel of
    // modern system buttons (e.g. Google Play Console).
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    text: {
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 18,
    },
  },
  sm: {
    height: 36,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    text: {
      fontFamily: fonts.medium,
      fontSize: 15,
      lineHeight: 20,
    },
  },
  md: {
    height: 44,
    paddingHorizontal: 20,
    paddingVertical: spacing.sm,
    text: {
      fontFamily: fonts.medium,
      fontSize: 17,
      lineHeight: 22,
    },
  },
  lg: {
    height: 52,
    paddingHorizontal: 28,
    paddingVertical: spacing.md,
    text: {
      fontFamily: fonts.medium,
      fontSize: 18,
      lineHeight: 24,
    },
  },
};

/**
 * Logical button variants mirroring the ShadCN set, expressed as React Native
 * style tokens. Text tone is expressed separately so ButtonLabel can derive the
 * right foreground color automatically.
 */
export type ButtonVariantToken =
  | 'cta'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'ai'
  | 'inverse'
  | 'destructive'
  | 'turmeric';

export type ButtonTextTone = 'default' | 'inverse' | 'accent' | 'destructive';

export const BUTTON_VARIANT_TOKENS: Record<
  ButtonVariantToken,
  {
    backgroundColor: string;
    borderWidth?: number;
    borderColor?: string;
    textTone: ButtonTextTone;
  }
> = {
  cta: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    // Subtle highlight stroke so filled and outline buttons have the same
    // visual "edge weight" and never read as different heights.
    borderColor: 'rgba(255,255,255,0.18)',
    textTone: 'inverse',
  },
  primary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    textTone: 'inverse',
  },
  secondary: {
    // Slightly darker than the card surface so secondary buttons read as
    // obvious, pill-shaped controls on white cards (e.g., Dev Tools screen).
    backgroundColor: colors.shellAlt,
    borderWidth: 1,
    borderColor: colors.border,
    textTone: 'default',
  },
  outline: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    textTone: 'default',
  },
  ghost: {
    backgroundColor: 'transparent',
    textTone: 'default',
  },
  link: {
    backgroundColor: 'transparent',
    textTone: 'accent',
  },
  ai: {
    // Gradient background is rendered by Button for this variant; keep the base
    // tokens transparent and reserve border space for consistent sizing.
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.aiBorder,
    textTone: 'inverse',
  },
  inverse: {
    // Inverse button for saturated/brand surfaces: parchment fill with pine text.
    backgroundColor: colors.parchment,
    borderWidth: 1,
    borderColor: 'transparent',
    textTone: 'accent',
  },
  destructive: {
    backgroundColor: colors.destructive,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    textTone: 'inverse',
  },
  turmeric: {
    backgroundColor: colors.turmeric,
    borderWidth: 1,
    borderColor: colors.turmeric,
    textTone: 'inverse',
  },
};


