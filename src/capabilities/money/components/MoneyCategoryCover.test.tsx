import { readFileSync } from 'fs';
import path from 'path';
import { act, render } from '@testing-library/react-native';
import type { UnsplashPhoto } from '../../../services/unsplash';
import type { MoneyCategoryCover } from '../domain/moneyCategoryCover';
import {
  buildMoneyCategoryCoverFromUnsplashPhoto,
  MoneyCategoryCoverDrawer,
} from './MoneyCategoryCoverDrawer';

type MockArcBannerSheetProps = {
  confirmDisabled?: boolean;
  confirmLabel?: string;
  hasHero: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  onRemove: () => void;
  onSelectUnsplash: (photo: UnsplashPhoto) => void;
  thumbnailUrl?: string;
};

const mockArcBannerSheetProps: MockArcBannerSheetProps[] = [];

jest.mock('../../../features/arcs/ArcBannerSheet', () => ({
  ArcBannerSheet: (props: MockArcBannerSheetProps) => {
    mockArcBannerSheetProps.push(props);
    return null;
  },
}));

jest.mock('../../../services/unsplash', () => ({
  ...jest.requireActual('../../../services/unsplash'),
  trackUnsplashDownload: jest.fn().mockResolvedValue(undefined),
}));

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
  beforeEach(() => {
    mockArcBannerSheetProps.length = 0;
  });

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
    expect(sharedSheetSource).toContain('variant="withClose"');
    expect(sharedSheetSource).not.toContain('titleVariant="lg"');
    expect(sharedSheetSource).toContain('keyboardAvoidanceEnabled={false}');
    expect(sharedSheetSource).toContain('automaticallyAdjustKeyboardInsets');
    expect(sharedSheetSource).toContain('returnKeyType="search"');
    expect(sharedSheetSource).toContain('...floatingControl.shadow');
    expect(drawerSource).toContain('trackUnsplashDownload(draftCover.photoId)');
  });

  it('stages a selected cover until Save cover explicitly confirms it', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(
      <MoneyCategoryCoverDrawer
        categoryName="Dress and Grooming"
        currentCover={null}
        onClose={onClose}
        onSave={onSave}
        saving={false}
        visible
      />,
    );

    expect(mockArcBannerSheetProps.at(-1)).toMatchObject({
      confirmDisabled: true,
      confirmLabel: 'Save cover',
      hasHero: false,
    });

    act(() => {
      mockArcBannerSheetProps.at(-1)?.onSelectUnsplash(photo);
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(mockArcBannerSheetProps.at(-1)).toMatchObject({
      confirmDisabled: false,
      hasHero: true,
      thumbnailUrl: 'https://images.unsplash.com/regular',
    });

    await act(async () => {
      await mockArcBannerSheetProps.at(-1)?.onConfirm?.();
    });

    expect(onSave).toHaveBeenCalledWith(buildMoneyCategoryCoverFromUnsplashPhoto(photo));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stages removal and discards draft changes when the drawer closes', () => {
    const currentCover: MoneyCategoryCover = buildMoneyCategoryCoverFromUnsplashPhoto(photo);
    const onClose = jest.fn();
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(
      <MoneyCategoryCoverDrawer
        categoryName="Dress and Grooming"
        currentCover={currentCover}
        onClose={onClose}
        onSave={onSave}
        saving={false}
        visible
      />,
    );

    act(() => {
      mockArcBannerSheetProps.at(-1)?.onRemove();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(mockArcBannerSheetProps.at(-1)).toMatchObject({
      confirmDisabled: false,
      hasHero: false,
      thumbnailUrl: undefined,
    });

    act(() => {
      mockArcBannerSheetProps.at(-1)?.onClose();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
