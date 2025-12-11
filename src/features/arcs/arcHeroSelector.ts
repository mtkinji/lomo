import type { Arc, FocusAreaId } from '../../domain/types';
import { hashStringToIndex, buildArcThumbnailSeed } from './thumbnailVisuals';
import { ARC_HERO_LIBRARY, type ArcHeroImage } from './arcHeroLibrary';

export type ArcHeroSelection = {
  /** Optional curated hero image to use as the primary banner + thumbnail. */
  image?: ArcHeroImage;
  /**
   * Deterministic seed for gradient / generative fallbacks. When image is
   * undefined, callers should render a gradient-based hero instead.
   */
  gradientSeed: string;
};

function getPrimaryFocusAreaForArc(_arc: Arc, userFocusAreas?: FocusAreaId[]): FocusAreaId | undefined {
  // For now, fall back to the user's primary focus area when present.
  // A future pass can attach explicit focus metadata to Arcs and prefer that.
  return userFocusAreas?.[0];
}

export function pickHeroForArc(
  arc: Arc,
  options: { userFocusAreas?: FocusAreaId[] } = {}
): ArcHeroSelection {
  const gradientSeed = buildArcThumbnailSeed(arc.id, arc.name, arc.thumbnailVariant);
  const focusArea = getPrimaryFocusAreaForArc(arc, options.userFocusAreas);

  let candidates = ARC_HERO_LIBRARY;

  if (focusArea) {
    const tagged = ARC_HERO_LIBRARY.filter((entry) =>
      entry.tags.focusAreas?.includes(focusArea)
    );
    if (tagged.length > 0) {
      candidates = tagged;
    }
  }

  if (candidates.length === 0) {
    return { gradientSeed };
  }

  const seed = `${arc.id}:${arc.name}`;
  const index = hashStringToIndex(seed, candidates.length);
  const image = candidates[index] ?? candidates[0];

  return { image, gradientSeed };
}
