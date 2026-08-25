import { Pressable } from '@/src/ui/HapticPressable';
import { useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '../../../theme';
import { Button, IconButton } from '../../../ui/Button';
import { Icon } from '../../../ui/Icon';
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

type Props = {
  media: CookCue['media'];
  display?: 'thumbnail' | 'trigger';
  onFullscreenEnter?: () => void;
  onFullscreenExit?: () => void;
};

function CookStepVideo({ media, uri, display, onFullscreenEnter, onFullscreenExit }: {
  media: CookStepMediaValue;
  uri: string;
  display: NonNullable<Props['display']>;
  onFullscreenEnter?: () => void;
  onFullscreenExit?: () => void;
}) {
  const player = useVideoPlayer(uri);
  const videoRef = useRef<VideoView>(null);
  const open = () => {
    player.play();
    videoRef.current?.enterFullscreen();
  };
  const video = <VideoView
    ref={videoRef}
    player={player}
    nativeControls={false}
    contentFit="cover"
    fullscreenOptions={{ enable: true, orientation: 'landscape' }}
    onFullscreenEnter={onFullscreenEnter}
    onFullscreenExit={() => {
      player.pause();
      onFullscreenExit?.();
    }}
    style={display === 'thumbnail' ? StyleSheet.absoluteFill : styles.hiddenVideo}
  />;
  if (display === 'trigger') return <View style={styles.mediaTrigger}>
    {video}
    <Button size="sm" variant="ghost" accessibilityLabel="Play cooking action video" onPress={open}>Play video</Button>
  </View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${media.altText ?? 'Cooking action video'}. Play full screen`}
      onPress={open}
      style={styles.media}
    >
      {video}
      <View pointerEvents="none" style={styles.playBadge}>
        <Icon name="play" size={22} color={colors.canvas} />
      </View>
    </Pressable>
  );
}

function CookStepImage({ media, uri, display, onFullscreenEnter, onFullscreenExit }: {
  media: CookStepMediaValue;
  uri: string;
  display: NonNullable<Props['display']>;
  onFullscreenEnter?: () => void;
  onFullscreenExit?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const close = () => {
    setExpanded(false);
    onFullscreenExit?.();
  };
  const open = () => {
    setExpanded(true);
    onFullscreenEnter?.();
  };
  return <>
    {display === 'trigger' ? <Button
      size="sm"
      variant="ghost"
      accessibilityLabel="Show cooking action photo"
      onPress={open}
      style={styles.mediaTrigger}
    >Show photo</Button> : <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${media.altText ?? 'Cooking action photo'}. Open full screen`}
      onPress={open}
      style={styles.media}
    >
      <RecipeArtwork
        storageRef={uri}
        accessibilityLabel={media.altText ?? 'Cooking action photo'}
        style={StyleSheet.absoluteFill}
      />
    </Pressable>}
    <Modal visible={expanded} animationType="fade" presentationStyle="fullScreen" supportedOrientations={['landscape-left', 'landscape-right']} onRequestClose={close}>
      <View style={styles.viewer}>
        <RecipeArtwork storageRef={uri} accessibilityLabel={media.altText ?? 'Cooking action photo'} style={styles.viewerImage} />
        <IconButton
          accessibilityLabel="Close full-screen photo"
          variant="inverse"
          onPress={close}
          style={[styles.closeButton, { top: insets.top + spacing.sm, right: insets.right + spacing.sm }]}
        >
          <Icon name="close" size={22} color={colors.canvas} />
        </IconButton>
      </View>
    </Modal>
  </>;
}

export function CookStepMedia({ media, display = 'thumbnail', onFullscreenEnter, onFullscreenExit }: Props) {
  if (!media) return null;
  const uri = displayableStorageRef(media);
  if (!uri) return null;
  if (media.mediaType.startsWith('video/')) return <CookStepVideo media={media} uri={uri} display={display} onFullscreenEnter={onFullscreenEnter} onFullscreenExit={onFullscreenExit} />;
  return <CookStepImage media={media} uri={uri} display={display} onFullscreenEnter={onFullscreenEnter} onFullscreenExit={onFullscreenExit} />;
}

const styles = StyleSheet.create({
  media: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.hero,
    overflow: 'hidden',
  },
  playBadge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,26,25,0.74)',
  },
  viewer: { flex: 1, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  closeButton: { position: 'absolute' },
  mediaTrigger: { alignSelf: 'flex-start' },
  hiddenVideo: { width: 1, height: 1, opacity: 0 },
});
