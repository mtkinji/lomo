import { useEffect, useState } from 'react';
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
  const [draftCover, setDraftCover] = useState<MoneyCategoryCover | null>(currentCover ?? null);
  const [committing, setCommitting] = useState(false);
  const busy = saving || committing;
  const hasDraftChange = (currentCover?.photoId ?? null) !== (draftCover?.photoId ?? null);

  useEffect(() => {
    if (visible) return;
    setDraftCover(currentCover ?? null);
    setError('');
    setCommitting(false);
  }, [currentCover, visible]);

  const choosePhoto = (photo: UnsplashPhoto) => {
    if (busy) return;
    setError('');
    setDraftCover(buildMoneyCategoryCoverFromUnsplashPhoto(photo));
  };

  const removeCover = () => {
    if (busy) return;
    setError('');
    setDraftCover(null);
  };

  const saveCover = async () => {
    if (busy || !hasDraftChange) return;
    setCommitting(true);
    setError('');
    try {
      await onSave(draftCover);
      if (draftCover) {
        void trackUnsplashDownload(draftCover.photoId).catch(() => undefined);
      }
      onClose();
    } catch {
      setError('The cover could not be saved. Try again.');
    } finally {
      setCommitting(false);
    }
  };

  const closeWithoutSaving = () => {
    if (busy) return;
    setError('');
    setDraftCover(currentCover ?? null);
    onClose();
  };

  return (
    <ArcBannerSheet
      arcName={categoryName}
      canUseUnsplash
      confirmDisabled={!hasDraftChange || busy}
      confirmLabel={busy ? 'Saving…' : 'Save cover'}
      error={error}
      hasHero={Boolean(draftCover)}
      heroGradientColors={[draftCover?.color ?? colors.pine50, colors.pine200, colors.pine700]}
      heroGradientDirection={{ start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } }}
      heroSeed={categoryName}
      heroTopoSizes={[]}
      imageLabel="cover"
      loading={busy}
      objectLabel="Category"
      onClose={closeWithoutSaving}
      onConfirm={saveCover}
      onGenerate={() => undefined}
      onRemove={removeCover}
      onSelectCurated={() => undefined}
      onSelectUnsplash={choosePhoto}
      onUpload={() => undefined}
      showGeoMosaic={false}
      showTopography={false}
      sourceTabs={['unsplash']}
      thumbnailUrl={draftCover?.imageUrl}
      title="Category cover"
      visible={visible}
    />
  );
}
