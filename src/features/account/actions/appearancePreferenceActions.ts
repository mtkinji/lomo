import type { ThumbnailStyle } from '../../../domain/types';

export const THUMBNAIL_STYLES: readonly ThumbnailStyle[] = [
  'topographyDots', 'geoMosaic', 'contourRings', 'pixelBlocks', 'plainGradient',
];

export type AppearancePreferenceBoundary = {
  read(): { updatedAt: string; thumbnailStyles: readonly ThumbnailStyle[] };
  apply(input: { thumbnailStyles: ThumbnailStyle[] }): void;
};

export class AppearancePreferenceConflictError extends Error {
  constructor() {
    super('The appearance preference changed after this request was reviewed.');
    this.name = 'AppearancePreferenceConflictError';
  }
}

function normalizeStyles(values: readonly string[]): ThumbnailStyle[] | null {
  if (values.length < 1 || values.length > THUMBNAIL_STYLES.length) return null;
  if (new Set(values).size !== values.length) return null;
  if (values.some((value) => !(THUMBNAIL_STYLES as readonly string[]).includes(value))) return null;
  return [...values] as ThumbnailStyle[];
}

export function createAppearancePreferenceActions(boundary: AppearancePreferenceBoundary) {
  return {
    read() {
      const current = boundary.read();
      return { updatedAt: current.updatedAt, thumbnailStyles: [...current.thumbnailStyles] };
    },
    update(input: { expectedUpdatedAt: string; thumbnailStyles: readonly string[] }) {
      const current = boundary.read();
      if (current.updatedAt !== input.expectedUpdatedAt) throw new AppearancePreferenceConflictError();
      const thumbnailStyles = normalizeStyles(input.thumbnailStyles);
      if (!thumbnailStyles) throw new Error('A valid non-empty appearance style selection is required.');
      const changed = thumbnailStyles.join('|') !== current.thumbnailStyles.join('|');
      if (changed) boundary.apply({ thumbnailStyles });
      return {
        previousThumbnailStyles: [...current.thumbnailStyles],
        thumbnailStyles,
        changed,
      };
    },
  };
}
