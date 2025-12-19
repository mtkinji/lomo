import { colors } from './colors';

export type ObjectTypeTone = 'activity' | 'goal' | 'arc' | 'chapter' | 'settings' | 'default';

export function getObjectTypeBadgeColors(
  tone: ObjectTypeTone | undefined,
): { backgroundColor: string; iconColor: string } {
  switch (tone) {
    case 'activity':
      return { backgroundColor: colors.turmeric500, iconColor: colors.canvas };
    case 'goal':
      return { backgroundColor: colors.quiltBlue500, iconColor: colors.canvas };
    case 'arc':
      return { backgroundColor: colors.accent, iconColor: colors.canvas };
    case 'chapter':
      return { backgroundColor: colors.madder600, iconColor: colors.canvas };
    case 'settings':
      return { backgroundColor: colors.gray700, iconColor: colors.canvas };
    default:
      return { backgroundColor: colors.gray700, iconColor: colors.canvas };
  }
}


