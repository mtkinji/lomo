import type { ImageSourcePropType } from 'react-native';
import type { ActivityType } from '../../domain/types';

export type ActivityHeaderArtworkFamily = 'madder' | 'turmeric' | 'pine' | 'quiltBlue' | 'indigo';

/**
 * Activity header artwork mapping.
 *
 * Goal: give each activity type a consistent “brand family” visual treatment.
 * You can swap any image here without touching UI layout code.
 */
const FAMILY_TO_ARTWORK: Record<ActivityHeaderArtworkFamily, ImageSourcePropType> = {
  // Warm, earthy red (Tasks => Madder)
  madder: require('../../../assets/illustrations/aspiration.png'),
  // Warm gold/orange (planning / list-like)
  turmeric: require('../../../assets/illustrations/goal-set.png'),
  // Brand green
  pine: require('../../../assets/illustrations/welcome.png'),
  // Cool quilt blue
  quiltBlue: require('../../../assets/illustrations/notifications.png'),
  // Deep indigo / night
  indigo: require('../../../assets/illustrations/aspirations.png'),
};

export function getActivityHeaderArtworkFamily(activityType: ActivityType): ActivityHeaderArtworkFamily {
  if (activityType.startsWith('custom:')) return 'pine';

  switch (activityType) {
    case 'task':
      return 'madder';
    case 'checklist':
      return 'quiltBlue';
    case 'shopping_list':
      return 'turmeric';
    case 'instructions':
      return 'pine';
    case 'plan':
      return 'indigo';
    default: {
      // Defensive fallback: ActivityType is intentionally extensible via `custom:${string}`.
      return 'pine';
    }
  }
}

export function getActivityHeaderArtworkSource(activityType: ActivityType): ImageSourcePropType {
  const family = getActivityHeaderArtworkFamily(activityType);
  return FAMILY_TO_ARTWORK[family];
}


