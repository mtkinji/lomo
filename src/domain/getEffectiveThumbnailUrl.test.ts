import { getEffectiveThumbnailUrl } from './getEffectiveThumbnailUrl';

// Mock the curated library so tests don't depend on Metro asset resolution
// (which returns null in the jest-expo environment).
jest.mock('./curatedHeroLibrary', () => ({
  __esModule: true,
  getArcHeroById: (id: string) =>
    id === 'curated-known' ? { id, uri: 'asset://kwilt/curated-known.png', tags: {} } : null,
  getArcHeroUriById: (id: string) =>
    id === 'curated-known' ? 'asset://kwilt/curated-known.png' : null,
  ARC_HERO_LIBRARY: [
    { id: 'curated-known', uri: 'asset://kwilt/curated-known.png', tags: {} },
  ],
}));

const CURATED_URI = 'asset://kwilt/curated-known.png';

describe('getEffectiveThumbnailUrl', () => {
  it('returns trimmed thumbnailUrl when no metadata is present', () => {
    expect(
      getEffectiveThumbnailUrl({ thumbnailUrl: '  https://example.com/x.jpg  ' }),
    ).toBe('https://example.com/x.jpg');
  });

  it('returns undefined when there is no thumbnailUrl and no meta', () => {
    expect(getEffectiveThumbnailUrl({})).toBeUndefined();
    expect(
      getEffectiveThumbnailUrl({ thumbnailUrl: '   ' }),
    ).toBeUndefined();
  });

  it('uses the bundled asset URI for curated heroes when available', () => {
    expect(
      getEffectiveThumbnailUrl({
        thumbnailUrl: 'https://stale.example.com/banner.jpg',
        heroImageMeta: {
          source: 'curated',
          curatedId: 'curated-known',
          createdAt: '2026-04-01T00:00:00.000Z',
        } as any,
      }),
    ).toBe(CURATED_URI);
  });

  it('falls back to thumbnailUrl when curatedId does not match the library', () => {
    expect(
      getEffectiveThumbnailUrl({
        thumbnailUrl: 'https://example.com/fallback.jpg',
        heroImageMeta: {
          source: 'curated',
          curatedId: 'unknown-curated-id',
          createdAt: '2026-04-01T00:00:00.000Z',
        } as any,
      }),
    ).toBe('https://example.com/fallback.jpg');
  });

  it('returns undefined for curated source without curatedId or thumbnailUrl', () => {
    expect(
      getEffectiveThumbnailUrl({
        heroImageMeta: { source: 'curated', createdAt: '2026-04-01T00:00:00.000Z' } as any,
      }),
    ).toBeUndefined();
  });

  it('keeps a stable Unsplash image URL when it points at the unsplash CDN', () => {
    expect(
      getEffectiveThumbnailUrl({
        thumbnailUrl: 'https://images.unsplash.com/photo-abc?w=1200',
        heroImageMeta: {
          source: 'unsplash',
          unsplashPhotoId: 'photo-abc',
          createdAt: '2026-04-01T00:00:00.000Z',
        } as any,
      }),
    ).toBe('https://images.unsplash.com/photo-abc?w=1200');
  });

  it('rebuilds an Unsplash source URL when thumbnailUrl is a transient file:// URI', () => {
    const url = getEffectiveThumbnailUrl({
      thumbnailUrl: 'file:///tmp/cached-image.jpg',
      heroImageMeta: {
        source: 'unsplash',
        unsplashPhotoId: 'photo-xyz',
        createdAt: '2026-04-01T00:00:00.000Z',
      } as any,
    });
    expect(url).toBe('https://source.unsplash.com/photo-xyz/1200x500');
  });

  it('rebuilds an Unsplash source URL when thumbnailUrl is missing entirely', () => {
    expect(
      getEffectiveThumbnailUrl({
        heroImageMeta: {
          source: 'unsplash',
          unsplashPhotoId: 'photo-xyz',
          createdAt: '2026-04-01T00:00:00.000Z',
        } as any,
      }),
    ).toBe('https://source.unsplash.com/photo-xyz/1200x500');
  });

  it('encodes unsafe characters in unsplash photo ids', () => {
    expect(
      getEffectiveThumbnailUrl({
        heroImageMeta: {
          source: 'unsplash',
          unsplashPhotoId: 'photo with space',
          createdAt: '2026-04-01T00:00:00.000Z',
        } as any,
      }),
    ).toBe('https://source.unsplash.com/photo%20with%20space/1200x500');
  });

  it('returns thumbnailUrl unchanged for non-curated, non-unsplash sources', () => {
    expect(
      getEffectiveThumbnailUrl({
        thumbnailUrl: 'https://cdn.example.com/upload.jpg',
        heroImageMeta: {
          source: 'upload',
          createdAt: '2026-04-01T00:00:00.000Z',
        } as any,
      }),
    ).toBe('https://cdn.example.com/upload.jpg');
  });
});
