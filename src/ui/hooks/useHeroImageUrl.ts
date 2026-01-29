import * as React from 'react';
import { getEffectiveThumbnailUrl } from '../../domain/getEffectiveThumbnailUrl';
import { getHeroImageSignedUrl } from '../../services/heroImages';

type HeroObj = {
  thumbnailUrl?: string | null;
  heroImageMeta?: {
    source?: string;
    uploadStoragePath?: string;
    unsplashPhotoId?: string;
    curatedId?: string;
  } | null;
};

/**
 * Resolve the best image URL for an object hero/thumbnail.
 *
 * - curated/unsplash: uses `getEffectiveThumbnailUrl` (pure + deterministic)
 * - upload: fetches a signed URL for `hero_images` and caches it (7 days)
 *
 * This is a hook so we can handle async signed-url fetching without mutating domain objects.
 */
export function useHeroImageUrl(obj: HeroObj | null | undefined): string | null {
  const source = obj?.heroImageMeta?.source ?? '';
  const uploadStoragePath = (obj?.heroImageMeta?.uploadStoragePath ?? '').trim();

  const base = React.useMemo(() => {
    if (!obj) return null;
    // For uploads, we intentionally do NOT trust `thumbnailUrl` because signed URLs can expire.
    if (source === 'upload' && uploadStoragePath) return null;
    return getEffectiveThumbnailUrl(obj as any) ?? null;
  }, [obj, source, uploadStoragePath]);

  const [signed, setSigned] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setSigned(null);

    if (source !== 'upload' || !uploadStoragePath) return;

    (async () => {
      try {
        const url = await getHeroImageSignedUrl(uploadStoragePath);
        if (mounted) setSigned(url);
      } catch {
        if (mounted) setSigned(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [source, uploadStoragePath]);

  return signed ?? base;
}


