import type { ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, typography } from '../theme';

type TextVariant = 'body' | 'bodySm' | 'label';
type HeadingVariant = 'xl' | 'lg' | 'md' | 'sm';
type Tone = 'default' | 'secondary' | 'muted' | 'accent' | 'destructive' | 'inverse';

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

