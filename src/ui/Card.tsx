import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { cardElevation, cardSurfaceStyle } from '../theme/surfaces';
import { spacing } from '../theme/spacing';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardElevation = keyof typeof cardElevation;

const paddingBySize: Record<Exclude<CardPadding, 'none'>, number> = {
  // For card interiors, use slightly larger gutters than raw spacing so
  // differences between sizes are visually meaningful.
  sm: spacing.lg, // 16
  md: spacing.xl, // 24
  lg: spacing['2xl'], // 32
};

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
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
  padding = 'md',
  elevation = 'soft',
}: CardProps) {
  const paddingStyle =
    padding === 'none' ? null : { padding: paddingBySize[padding] };
  const elevationStyle = cardElevation[elevation] as ViewStyle | undefined;

  return (
    <View
      style={[
        cardSurfaceStyle,
        { marginVertical: spacing.xs },
        style,
        elevationStyle,
        paddingStyle,
      ]}
    >
      {children}
    </View>
  );
}
