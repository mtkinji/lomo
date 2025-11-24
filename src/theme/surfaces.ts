import { colors } from './colors';

export const cardSurfaceStyle = {
  backgroundColor: colors.card,
  // ShadCN-style card radius – a bit larger than buttons so cards feel like containers
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  // Very soft, tight shadow so stacked lists don’t create a darker central “column”
  shadowColor: colors.accent,
  shadowOpacity: 0.025,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 6,
  elevation: 1,
} as const;


