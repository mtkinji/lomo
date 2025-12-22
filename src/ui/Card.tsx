import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { cardElevation, cardSurfaceStyle } from '../theme/surfaces';
import { spacing } from '../theme/spacing';

export type CardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg';
type SpaceToken = keyof typeof spacing;
type SpaceValue = SpaceToken | number;

export type CardElevation = keyof typeof cardElevation;

const paddingBySize: Record<Exclude<CardPadding, 'none'>, number> = {
  // For card interiors, use slightly larger gutters than raw spacing so
  // differences between sizes are visually meaningful.
  xs: spacing.md, // 12
  sm: spacing.lg, // 16
  md: spacing.xl, // 24
  lg: spacing['2xl'], // 32
};

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Tokenized margin controls.
   *
   * Notes:
   * - Defaults to `marginVertical="xs"` to preserve historical spacing.
   * - If you provide both `margin` and a directional margin prop, the directional prop wins.
   */
  margin?: SpaceValue;
  marginHorizontal?: SpaceValue;
  marginVertical?: SpaceValue;
  marginTop?: SpaceValue;
  marginRight?: SpaceValue;
  marginBottom?: SpaceValue;
  marginLeft?: SpaceValue;
  /**
   * Standardized padding presets for card content.
   *
   * Defaults to `md` so most cards feel like self-contained surfaces without
   * requiring per-usage padding. Use `none` when you need to tightly control
   * interior layout yourself.
   */
  padding?: CardPadding;
  /**
   * Elevation preset for the card shadow. Defaults to `soft`, which matches
   * the historical Card behavior. Use `none` for flat inline groupings or
   * `raised` for hero question / reveal cards.
   */
  elevation?: CardElevation;
}

export function Card({
  children,
  style,
  margin,
  marginHorizontal,
  marginVertical = 'xs',
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  padding = 'md',
  elevation = 'soft',
}: CardProps) {
  const resolveSpace = (value: SpaceValue | undefined) => {
    if (value == null) return undefined;
    return typeof value === 'number' ? value : spacing[value];
  };

  const paddingStyle =
    padding === 'none' ? null : { padding: paddingBySize[padding] };
  const elevationStyle = cardElevation[elevation] as ViewStyle | undefined;

  const marginStyle: ViewStyle = {
    ...(margin != null ? { margin: resolveSpace(margin) } : null),
    ...(marginHorizontal != null ? { marginHorizontal: resolveSpace(marginHorizontal) } : null),
    ...(marginVertical != null ? { marginVertical: resolveSpace(marginVertical) } : null),
    ...(marginTop != null ? { marginTop: resolveSpace(marginTop) } : null),
    ...(marginRight != null ? { marginRight: resolveSpace(marginRight) } : null),
    ...(marginBottom != null ? { marginBottom: resolveSpace(marginBottom) } : null),
    ...(marginLeft != null ? { marginLeft: resolveSpace(marginLeft) } : null),
  };

  return (
    <View
      style={[
        cardSurfaceStyle,
        marginStyle,
        style,
        elevationStyle,
        paddingStyle,
      ]}
    >
      {children}
    </View>
  );
}
