import { View, Text, StyleSheet, Platform, type ViewStyle, type TextStyle } from 'react-native';
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
   * Optional override for the wordmark color. Defaults to Sumi (our primary ink).
   */
  color?: string;
  /**
   * Optional variant for the logo mark. Use 'white' or 'parchment' for saturated/dark backgrounds.
   */
  logoVariant?: 'default' | 'white' | 'parchment';
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
  color = colors.sumi,
  logoVariant = 'default',
  style,
  wordmarkStyle,
}: BrandLockupProps) {
  const baseWordmarkStyle =
    wordmarkSize === 'lg' ? styles.wordmarkLg : styles.wordmarkSm;
  // Optical alignment: Urbanist's ascent/descender metrics can make the
  // wordmark read slightly low next to the logo mark on iOS. A small upward
  // nudge keeps the lockup visually centered.
  const iosWordmarkNudge = Platform.OS === 'ios' ? (wordmarkSize === 'lg' ? -0.75 : -0.5) : 0;

  return (
    <View style={[styles.root, style]}>
      <Logo size={logoSize} variant={logoVariant} />
      <Text
        style={[
          baseWordmarkStyle,
          iosWordmarkNudge ? { transform: [{ translateY: iosWordmarkNudge }] } : null,
          { color },
          wordmarkStyle,
        ]}
      >
        Kwilt
      </Text>
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
    fontSize: 22,
    lineHeight: 32,
    // Android adds extra top/bottom font padding by default which throws off
    // optical vertical centering next to the logo mark.
    includeFontPadding: false,
  },
  wordmarkLg: {
    ...typography.titleMd,
    fontFamily: fonts.logo,
    includeFontPadding: false,
  },
});


