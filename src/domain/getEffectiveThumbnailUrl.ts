import { getArcHeroUriById } from './curatedHeroLibrary';

/**
 * Derive the most reliable thumbnail/hero URL for a domain object.
 *
 * Why this exists:
 * - Bundled asset URIs can change across builds.
 * - Unsplash URLs may be stored as transient local file URIs.
 * - `thumbnailUrl` is still the canonical persisted field, but `heroImageMeta`
 *   can often reconstruct a better URL for display without mutating state.
 */
export function getEffectiveThumbnailUrl(obj: {
  thumbnailUrl?: unknown;
  heroImageMeta?: unknown;
}): string | undefined {
  const rawUrl = typeof obj?.thumbnailUrl === 'string' ? obj.thumbnailUrl.trim() : '';
  const meta = obj?.heroImageMeta && typeof obj.heroImageMeta === 'object' ? (obj.heroImageMeta as any) : null;
  const source = typeof meta?.source === 'string' ? String(meta.source) : '';

  if (source === 'curated') {
    const curatedId = typeof meta?.curatedId === 'string' ? meta.curatedId.trim() : '';
    const resolved = curatedId ? getArcHeroUriById(curatedId) : null;
    return (resolved ?? rawUrl) || undefined;
  }

  if (source === 'unsplash') {
    const photoId = typeof meta?.unsplashPhotoId === 'string' ? meta.unsplashPhotoId.trim() : '';
    if (!photoId) return rawUrl || undefined;

    const isUnsplashImageUrl =
      rawUrl.includes('images.unsplash.com') || rawUrl.includes('source.unsplash.com') || rawUrl.includes('plus.unsplash.com');
    const isTransientFile = rawUrl.startsWith('file://') || rawUrl.startsWith('content://');
    if (!rawUrl || isTransientFile || !isUnsplashImageUrl) {
      return `https://source.unsplash.com/${encodeURIComponent(photoId)}/1200x500`;
    }
    return rawUrl;
  }

  return rawUrl || undefined;
}


