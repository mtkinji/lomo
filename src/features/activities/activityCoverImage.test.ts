import { buildActivityCoverFallbackQuery, findActivityCoverImageWithAI } from './activityCoverImage';
import type { UnsplashPhoto } from '../../services/unsplash';

const photo = (id: string): UnsplashPhoto => ({
  id,
  width: 1200,
  height: 800,
  description: null,
  alt_description: null,
  urls: {
    raw: `https://images.unsplash.com/${id}?raw`,
    full: `https://images.unsplash.com/${id}?full`,
    regular: `https://images.unsplash.com/${id}?regular`,
    small: `https://images.unsplash.com/${id}?small`,
    thumb: `https://images.unsplash.com/${id}?thumb`,
  },
  user: {
    name: 'Photographer',
    links: {
      html: `https://unsplash.com/@${id}`,
    },
  },
  links: {
    html: `https://unsplash.com/photos/${id}`,
  },
});

describe('activity cover image lookup', () => {
  it('builds a compact activity-title fallback query', () => {
    expect(
      buildActivityCoverFallbackQuery({
        title: 'Update the Orchard book writing system!!!',
        existingTags: ['writing', 'essays'],
      }),
    ).toBe('Update the Orchard book writing');
  });

  it('tries the literal activity fallback when the generated query returns no photos', async () => {
    const searchPhotos = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([photo('orchard-essay-cover')]);
    const trackDownload = jest.fn().mockResolvedValue(undefined);

    const result = await findActivityCoverImageWithAI(
      {
        title: 'Update the Orchard book writing system',
        goalId: null,
        activityType: 'task',
        existingTags: ['essays'],
        goals: [],
        arcs: [],
        canUseUnsplash: true,
      },
      {
        generateQuery: jest.fn().mockResolvedValue('abstract productivity desk'),
        searchPhotos,
        trackDownload,
      },
    );

    expect(searchPhotos).toHaveBeenNthCalledWith(
      1,
      'abstract productivity desk',
      expect.objectContaining({ orientation: 'landscape' }),
    );
    expect(searchPhotos).toHaveBeenNthCalledWith(
      2,
      'Update the Orchard book writing',
      expect.objectContaining({ orientation: 'landscape' }),
    );
    expect(result?.thumbnailUrl).toBe('https://images.unsplash.com/orchard-essay-cover?regular');
    expect(result?.heroImageMeta?.source).toBe('unsplash');
    expect(trackDownload).toHaveBeenCalledWith('orchard-essay-cover');
  });

  it('does not search when Unsplash covers are unavailable', async () => {
    const searchPhotos = jest.fn();

    await expect(
      findActivityCoverImageWithAI(
        {
          title: 'Book campsite',
          goalId: null,
          goals: [],
          arcs: [],
          canUseUnsplash: false,
        },
        { searchPhotos },
      ),
    ).resolves.toBeNull();

    expect(searchPhotos).not.toHaveBeenCalled();
  });
});
