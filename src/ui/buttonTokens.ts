import { colors, fonts, spacing } from '../theme';

/**
 * Logical button sizes that control both container dimensions and typography.
 */
export type ButtonSizeToken = 'sm' | 'md' | 'lg';

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
  sm: {
    height: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    text: {
      fontFamily: fonts.medium,
      fontSize: 15,
      lineHeight: 20,
    },
  },
  md: {
    height: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    text: {
      fontFamily: fonts.medium,
      fontSize: 17,
      lineHeight: 22,
    },
  },
  lg: {
    height: 52,
    paddingHorizontal: spacing.xl,
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
  | 'destructive';

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
    textTone: 'inverse',
  },
  primary: {
    backgroundColor: colors.primary,
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
  destructive: {
    backgroundColor: colors.destructive,
    textTone: 'inverse',
  },
};


