import { useEffect, useState } from 'react';
import { AppState, Image, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { SoundscapeId } from '../../services/soundscapeCatalog';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';
import {
  focusVideoEnvironment,
  type FocusVideoEnvironment,
} from './focusEnvironmentCatalog';

type FocusEnvironmentBackdropProps = {
  soundscapeId: SoundscapeId;
  running: boolean;
};

function FocusEnvironmentVideo(props: {
  environment: FocusVideoEnvironment;
  running: boolean;
}) {
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const player = useVideoPlayer(props.environment.video, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = true;
    nextPlayer.volume = 0;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (props.running && appActive) {
      player.play();
      return;
    }
    player.pause();
  }, [appActive, player, props.running]);

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      onFirstFrameRender={() => setFirstFrameReady(true)}
      style={[styles.media, !firstFrameReady && styles.videoWaiting]}
      testID="focus-environment-video"
    />
  );
}

export function FocusEnvironmentBackdrop({
  soundscapeId,
  running,
}: FocusEnvironmentBackdropProps) {
  const environment = focusVideoEnvironment(soundscapeId);
  const { reduceMotionEnabled } = useAccessibilityPreferences();

  if (!environment) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Image
        source={environment.poster}
        resizeMode="cover"
        style={styles.media}
        testID="focus-environment-poster"
      />
      {!reduceMotionEnabled ? (
        <FocusEnvironmentVideo environment={environment} running={running} />
      ) : null}
      <View style={styles.scrim} />
    </View>
  );
}

const styles = StyleSheet.create({
  media: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  videoWaiting: {
    opacity: 0,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 24, 20, 0.28)',
  },
});
