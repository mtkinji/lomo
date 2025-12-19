import type { Arc, FocusAreaId } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';
import { generateArcBannerVibeQuery } from '../../services/ai';
import { searchUnsplashPhotos, UnsplashError } from '../../services/unsplash';
import { pickHeroForArc } from './arcHeroSelector';

type PrefillFallbackCuratedOptions = {
  userFocusAreas?: FocusAreaId[] | undefined;
};

type EnsureArcBannerPrefillOptions = {
  goalTitles?: string[];
  fallbackCurated?: PrefillFallbackCuratedOptions;
};

export async function ensureArcBannerPrefill(
  arc: Arc,
  options: EnsureArcBannerPrefillOptions = {}
): Promise<void> {
  // Never overwrite an existing banner.
  const current = useAppStore.getState().arcs.find((a) => a.id === arc.id);
  if (!current || current.thumbnailUrl) {
    return;
  }

  const vibeQuery =
    (await generateArcBannerVibeQuery({
      arcName: arc.name,
      arcNarrative: arc.narrative,
      goalTitles: options.goalTitles,
    })) ?? '';

  const query = (vibeQuery || arc.name).trim();
  if (!query) {
    return;
  }

  try {
    const results = await searchUnsplashPhotos(query, { perPage: 30, page: 1 });
    const photo = results?.[0];
    if (!photo) {
      throw new UnsplashError('http_error', 'No results', 200);
    }

    const nowIso = new Date().toISOString();
    useAppStore.getState().updateArc(arc.id, (stateArc) => {
      if (stateArc.thumbnailUrl) return stateArc;
      return {
        ...stateArc,
        thumbnailUrl: photo.urls.regular,
        heroImageMeta: {
          source: 'unsplash',
          prompt: vibeQuery || query,
          createdAt: nowIso,
          unsplashPhotoId: photo.id,
          unsplashAuthorName: photo.user.name,
          unsplashAuthorLink: photo.user.links.html,
          unsplashLink: photo.links.html,
        },
        heroHidden: false,
        updatedAt: nowIso,
      };
    });
    return;
  } catch (err) {
    // Fall back to curated selection (best-effort) when Unsplash is unavailable.
    if (!options.fallbackCurated) {
      return;
    }
    const nowIso = new Date().toISOString();
    const fallback = pickHeroForArc(arc, {
      userFocusAreas: options.fallbackCurated.userFocusAreas,
    });
    if (!fallback.image) {
      return;
    }
    useAppStore.getState().updateArc(arc.id, (stateArc) => {
      if (stateArc.thumbnailUrl) return stateArc;
      return {
        ...stateArc,
        thumbnailUrl: fallback.image!.uri,
        thumbnailVariant: stateArc.thumbnailVariant ?? 0,
        heroImageMeta: {
          source: 'curated',
          prompt: vibeQuery || query || undefined,
          createdAt: nowIso,
          curatedId: fallback.image!.id,
        },
        heroHidden: false,
        updatedAt: nowIso,
      };
    });
  }
}


