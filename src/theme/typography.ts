import { Platform } from 'react-native';

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
  // Brand wordmark font (loaded in App.tsx).
  logo: 'Urbanist_900Black',
};

const monoFontFamily =
  Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) ?? 'monospace';

export const typography = {
  titleXl: {
    // Largest Arc heading: keep size but move to 800 weight for a slightly softer top level
    fontFamily: fonts.extrabold,
    fontSize: 32,
    lineHeight: 38,
  },
  titleLg: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  titleMd: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 28,
  },
  titleSm: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.regular,
    // Treat 17pt as the canonical body size so core copy and button labels
    // feel aligned with native mobile defaults (e.g., iOS body text).
    fontSize: 17,
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodyXs: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  brand: {
    fontFamily: fonts.logo,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 1,
  },
  mono: {
    fontFamily: monoFontFamily,
    fontSize: 12,
    lineHeight: 16,
  },
};
