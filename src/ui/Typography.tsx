import type { ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, typography, fonts } from '../theme';

type TextVariant = 'body' | 'bodySm' | 'label';
type HeadingVariant = 'xl' | 'lg' | 'md' | 'sm';
type Tone = 'default' | 'secondary' | 'muted' | 'accent' | 'destructive' | 'inverse';
type ButtonSizeVariant = 'sm' | 'md' | 'lg';

type BaseTextProps = RNTextProps & {
  children?: ReactNode;
};

export type AppTextProps = BaseTextProps & {
  variant?: TextVariant;
  tone?: Tone;
};

export type AppHeadingProps = BaseTextProps & {
  variant?: HeadingVariant;
  tone?: Tone;
};

export type ButtonLabelProps = BaseTextProps & {
  /**
   * Size key matches the button size tokens so labels stay in sync with
   * control sizing. Defaults to "md" which aligns with the core CTA size.
   */
  size?: ButtonSizeVariant;
  tone?: Tone;
};

function getToneColor(tone: Tone | undefined): string {
  switch (tone) {
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.muted;
    case 'accent':
      return colors.accent;
    case 'destructive':
      return colors.destructive;
    case 'inverse':
      return colors.canvas;
    case 'default':
    default:
      return colors.textPrimary;
  }
}

function getTextVariantStyle(variant: TextVariant | undefined) {
  if (variant === 'body') return typography.body;
  if (variant === 'label') return typography.label;
  // Default for generic copy: small body text.
  return typography.bodySm;
}

function getHeadingVariantStyle(variant: HeadingVariant | undefined) {
  switch (variant) {
    case 'xl':
      return typography.titleXl;
    case 'lg':
      return typography.titleLg;
    case 'md':
      return typography.titleMd;
    case 'sm':
    default:
      return typography.titleSm;
  }
}

/**
 * App-level body text primitive. Mirrors `typography.body*` plus color tokens.
 */
export function Text({ style, children, variant = 'bodySm', tone = 'default', ...rest }: AppTextProps) {
  return (
    <RNText
      {...rest}
      style={[
        {
          ...getTextVariantStyle(variant),
          color: getToneColor(tone),
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

/**
 * App-level heading primitive. Mirrors `typography.title*` plus color tokens.
 */
export function Heading({
  style,
  children,
  variant = 'sm',
  tone = 'default',
  ...rest
}: AppHeadingProps) {
  return (
    <RNText
      {...rest}
      style={[
        {
          ...getHeadingVariantStyle(variant),
          color: getToneColor(tone),
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const buttonLabelBySize: Record<ButtonSizeVariant, { fontFamily: string; fontSize: number; lineHeight: number }> =
  {
    sm: {
      fontFamily: fonts.medium,
      fontSize: 15,
      lineHeight: 20,
    },
    md: {
      fontFamily: fonts.medium,
      fontSize: 17,
      lineHeight: 22,
    },
    lg: {
      fontFamily: fonts.medium,
      fontSize: 18,
      lineHeight: 24,
    },
  };

/**
 * Canonical button label primitive. Use this for any text placed inside a
 * Button (or button-like surface) so size and weight stay consistent across
 * the app. Defaults to medium-weight body text at the md button size.
 */
export function ButtonLabel({
  style,
  children,
  size = 'md',
  tone = 'default',
  ...rest
}: ButtonLabelProps) {
  const base = buttonLabelBySize[size] ?? buttonLabelBySize.md;

  return (
    <RNText
      {...rest}
      style={[
        {
          ...base,
          color: getToneColor(tone),
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

