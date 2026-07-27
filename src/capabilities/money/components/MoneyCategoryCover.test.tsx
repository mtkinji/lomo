import { readFileSync } from 'fs';
import path from 'path';
import type { UnsplashPhoto } from '../../../services/unsplash';
import { buildMoneyCategoryCoverFromUnsplashPhoto } from './MoneyCategoryCoverDrawer';

const photo: UnsplashPhoto = {
  id: 'photo-1',
  color: '#123456',
  urls: {
    raw: 'https://images.unsplash.com/raw',
    full: 'https://images.unsplash.com/full',
    regular: 'https://images.unsplash.com/regular',
    small: 'https://images.unsplash.com/small',
    thumb: 'https://images.unsplash.com/thumb',
  },
  user: { name: 'A Photographer', links: { html: 'https://unsplash.com/@artist' } },
  links: { html: 'https://unsplash.com/photos/photo-1' },
};

describe('Money category covers', () => {
  it('persists only the regular image and required Unsplash attribution metadata', () => {
    expect(buildMoneyCategoryCoverFromUnsplashPhoto(photo)).toEqual({
      source: 'unsplash',
      photoId: 'photo-1',
      imageUrl: 'https://images.unsplash.com/regular',
      photographerName: 'A Photographer',
      photographerUrl: 'https://unsplash.com/@artist?utm_source=Kwilt&utm_medium=referral',
      sourceUrl: 'https://unsplash.com/photos/photo-1?utm_source=Kwilt&utm_medium=referral',
      color: '#123456',
    });
  });

  it('keeps failure, attribution, shared search, and download-tracking behavior explicit', () => {
    const coverSource = readFileSync(path.join(__dirname, 'MoneyCategoryCover.tsx'), 'utf8');
    const drawerSource = readFileSync(path.join(__dirname, 'MoneyCategoryCoverDrawer.tsx'), 'utf8');
    const sharedSheetSource = readFileSync(path.join(
      process.cwd(),
      'src/features/arcs/ArcBannerSheet.tsx',
    ), 'utf8');

    expect(coverSource).toContain('onError={() => setImageFailed(true)}');
    expect(coverSource).toContain('Cover image unavailable');
    expect(coverSource).toContain('Photo by');
    expect(drawerSource).toContain('<ArcBannerSheet');
    expect(drawerSource).toContain("sourceTabs={['unsplash']}");
    expect(drawerSource).toContain('title="Category cover"');
    expect(sharedSheetSource).toContain('searchUnsplashPhotos(query, { perPage: 30, page: 1 })');
    expect(sharedSheetSource).toContain('unsplashMasonryColumns');
    expect(drawerSource).toContain('trackUnsplashDownload(photo.id)');
  });
});
