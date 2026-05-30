import type { ImageSourcePropType } from 'react-native';
import type { ActivityType } from '../../domain/types';
import { ARC_HERO_LIBRARY } from '../arcs/arcHeroLibrary';
import { hashStringToIndex } from '../arcs/thumbnailVisuals';

export type ActivityHeaderArtworkFamily = 'madder' | 'turmeric' | 'pine' | 'quiltBlue' | 'indigo';

type ActivityHeaderArtworkInput = {
  id?: string | null;
  title?: string | null;
  type?: ActivityType | null;
};

/**
 * Activity header artwork mapping.
 *
 * Goal: give each activity a varied but stable default hero from the curated cover library.
 * We hash stable activity identity instead of choosing randomly at render time so a new To-do
 * keeps the same default image across renders, app launches, and title edits.
 */
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

export function getActivityHeaderArtworkSource(activity: ActivityHeaderArtworkInput): ImageSourcePropType | undefined {
  if (ARC_HERO_LIBRARY.length > 0) {
    const type = activity.type ?? 'task';
    const identitySeed = activity.id ?? activity.title ?? '';
    const seed = `${identitySeed}:${type}`;
    const index = hashStringToIndex(seed, ARC_HERO_LIBRARY.length);
    const image = ARC_HERO_LIBRARY[index] ?? ARC_HERO_LIBRARY[0];
    if (image?.uri) {
      return { uri: image.uri };
    }
  }

  return undefined;
}
