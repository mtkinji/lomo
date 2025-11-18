import { colors } from './colors';

export const cardSurfaceStyle = {
  backgroundColor: colors.card,
  // Slightly tighter radius so cards feel lighter in dense lists
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  // Very soft, tight shadow so stacked lists don’t create a darker central “column”
  shadowColor: colors.accent,
  shadowOpacity: 0.025,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 6,
  elevation: 1,
} as const;


