import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Logo } from './Logo';
import { colors } from '../theme/colors';
import { typography, fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';

type BrandLockupProps = {
  /**
   * Optional size for the logo mark. Defaults to 32 which matches the
   * primary chat header and coach surfaces.
   */
  logoSize?: number;
  /**
   * Controls the wordmark sizing so different hosts can tune the lockup
   * without duplicating styles.
   *
   * - 'sm' – used for sheet headers (goal coach, arc creation)
   * - 'lg' – used for the main chat canvas header
   */
  wordmarkSize?: 'sm' | 'lg';
  /**
   * Optional override for the wordmark color. Defaults to the brand accent.
   */
  color?: string;
  /**
   * Optional style override for the outer container.
   */
  style?: ViewStyle;
  /**
   * Optional style override for the wordmark text.
   */
  wordmarkStyle?: TextStyle;
};

export function BrandLockup({
  logoSize = 32,
  wordmarkSize = 'sm',
  color = colors.accent,
  style,
  wordmarkStyle,
}: BrandLockupProps) {
  const baseWordmarkStyle =
    wordmarkSize === 'lg' ? styles.wordmarkLg : styles.wordmarkSm;

  return (
    <View style={[styles.root, style]}>
      <Logo size={logoSize} />
      <Text style={[baseWordmarkStyle, { color }, wordmarkStyle]}>kwilt</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wordmarkSm: {
    fontFamily: fonts.logo,
    fontSize: 18,
    lineHeight: 22,
  },
  wordmarkLg: {
    ...typography.titleMd,
    fontFamily: fonts.logo,
  },
});


