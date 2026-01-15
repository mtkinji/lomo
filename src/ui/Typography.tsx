import React from 'react';
import type { ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { fonts } from '../theme/typography';
import { BUTTON_SIZE_TOKENS, type ButtonSizeToken } from './buttonTokens';
import { ButtonContext } from './ButtonContext';

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

export type ButtonLabelProps = BaseTextProps & {
  /**
   * Size key matches the button size tokens so labels stay in sync with
   * control sizing. Defaults to "md" which aligns with the core CTA size.
   */
  size?: ButtonSizeToken;
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

/**
 * Canonical button label primitive. Use this for any text placed inside a
 * Button (or button-like surface) so size and weight stay consistent across
 * the app. Defaults to medium-weight body text at the md button size.
 */
export function ButtonLabel({
  style,
  children,
  size,
  tone = 'default',
  ...rest
}: ButtonLabelProps) {
  const inherited = React.useContext(ButtonContext);
  const resolvedSize = size ?? inherited?.size ?? 'md';
  const base = BUTTON_SIZE_TOKENS[resolvedSize].text;

  return (
    <RNText
      {...rest}
      style={[
        {
          ...base,
          color: getToneColor(tone),
          // Android adds extra top/bottom font padding by default, which can
          // make labels look vertically off-center inside fixed-height buttons.
          includeFontPadding: false,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

