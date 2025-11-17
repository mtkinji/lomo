import { colors } from './colors';

export const cardSurfaceStyle = {
  backgroundColor: colors.card,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: '#0F172A',
  shadowOpacity: 0.05,
  shadowOffset: { width: 0, height: 8 },
  shadowRadius: 24,
  elevation: 5,
} as const;


