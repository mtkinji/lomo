export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const typography = {
  titleLg: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
  },
  titleSm: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  bodySm: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};


