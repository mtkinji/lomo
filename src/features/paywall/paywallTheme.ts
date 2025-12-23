import { colors, spacing } from '../../theme';

export const paywallTheme = {
  gradientColors: [colors.aiGradientStart, colors.aiGradientMid, colors.aiGradientEnd],
  surfaceBorder: colors.aiBorder,
  foreground: colors.aiForeground,
  // High-contrast inverse CTA: light button on dark/colored surface.
  ctaBackground: colors.parchment,
  ctaForeground: colors.accent,
  ctaBorder: 'rgba(255,255,255,0.35)',
  cornerRadius: 18,
  padding: spacing.lg,
};


