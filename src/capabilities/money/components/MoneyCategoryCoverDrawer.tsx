import { useState } from 'react';
import { trackUnsplashDownload, withUnsplashReferral, type UnsplashPhoto } from '../../../services/unsplash';
import { colors } from '../../../theme';
import { ArcBannerSheet } from '../../../features/arcs/ArcBannerSheet';
import type { MoneyCategoryCover } from '../domain/moneyCategoryCover';

type Props = {
  categoryName: string;
  currentCover?: MoneyCategoryCover | null;
  onClose: () => void;
  onSave: (cover: MoneyCategoryCover | null) => Promise<void>;
  saving: boolean;
  visible: boolean;
};

export function buildMoneyCategoryCoverFromUnsplashPhoto(photo: UnsplashPhoto): MoneyCategoryCover {
  return {
    source: 'unsplash',
    photoId: photo.id,
    imageUrl: photo.urls.regular,
    photographerName: photo.user.name,
    photographerUrl: withUnsplashReferral(photo.user.links.html),
    sourceUrl: withUnsplashReferral(photo.links.html),
    color: photo.color ?? null,
  };
}

export function MoneyCategoryCoverDrawer({
  categoryName,
  currentCover,
  onClose,
  onSave,
  saving,
  visible,
}: Props) {
  const [error, setError] = useState('');

  const choosePhoto = async (photo: UnsplashPhoto) => {
    if (saving) return;
    setError('');
    try {
      await onSave(buildMoneyCategoryCoverFromUnsplashPhoto(photo));
      void trackUnsplashDownload(photo.id).catch(() => undefined);
    } catch {
      setError('The cover could not be saved. Try again.');
    }
  };

  const removeCover = async () => {
    if (saving) return;
    setError('');
    try {
      await onSave(null);
    } catch {
      setError('The cover could not be removed. Try again.');
    }
  };

  return (
    <ArcBannerSheet
      arcName={categoryName}
      canUseUnsplash
      error={error}
      hasHero={Boolean(currentCover)}
      heroGradientColors={[currentCover?.color ?? colors.pine50, colors.pine200, colors.pine700]}
      heroGradientDirection={{ start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } }}
      heroSeed={categoryName}
      heroTopoSizes={[]}
      imageLabel="cover"
      loading={saving}
      objectLabel="Category"
      onClose={() => {
        setError('');
        onClose();
      }}
      onGenerate={() => undefined}
      onRemove={() => void removeCover()}
      onSelectCurated={() => undefined}
      onSelectUnsplash={(photo) => void choosePhoto(photo)}
      onUpload={() => undefined}
      showGeoMosaic={false}
      showTopography={false}
      sourceTabs={['unsplash']}
      thumbnailUrl={currentCover?.imageUrl}
      title="Category cover"
      visible={visible}
    />
  );
}
