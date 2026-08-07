import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { radii } from '../../../theme';
import { RecipeArtwork } from './RecipeArtwork';
import type { CookCue } from '../domain/recipeCookContracts';

type CookStepMediaValue = NonNullable<CookCue['media']>;

function displayableStorageRef(media: CookStepMediaValue): string | null {
  if (media.mediaType.startsWith('image/')) {
    return /^(bundle:|https?:|file:|data:)/.test(media.storageRef) ? media.storageRef : null;
  }
  if (media.mediaType.startsWith('video/')) {
    return /^(https?:|file:)/.test(media.storageRef) ? media.storageRef : null;
  }
  return null;
}

function CookStepVideo({ media, uri }: { media: CookStepMediaValue; uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      accessibilityLabel={media.altText ?? 'Cooking step video'}
      player={player}
      nativeControls
      contentFit="cover"
      style={styles.media}
    />
  );
}

export function CookStepMedia({ media }: { media: CookCue['media'] }) {
  if (!media) return null;
  const uri = displayableStorageRef(media);
  if (!uri) return null;
  if (media.mediaType.startsWith('video/')) return <CookStepVideo media={media} uri={uri} />;
  return (
    <RecipeArtwork
      storageRef={uri}
      accessibilityLabel={media.altText ?? 'Cooking step photo'}
      style={styles.media}
    />
  );
}

const styles = StyleSheet.create({
  media: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.hero,
    overflow: 'hidden',
  },
});
