import { useEffect, useState } from 'react';
import { AppState, Image, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';

/** Decorative media only. Never a prerequisite for navigating or reading. */
export function OnboardingShorelineBackdrop({ active, tone = 'light' }: { active: boolean; tone?: 'light' | 'dark' }) {
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const [failed, setFailed] = useState(false);
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Image source={require('../../../assets/onboarding/shoreline-poster.jpg')} resizeMode="cover" style={styles.media} testID="onboarding.shoreline.poster" />
      {!reduceMotionEnabled && !failed ? <ShorelineVideo active={active} onFailure={() => setFailed(true)} /> : null}
      {tone === 'dark' ? <LinearGradient
        colors={[`${colors.textPrimary}66`, `${colors.textPrimary}A3`, `${colors.textPrimary}A3`, `${colors.textPrimary}73`]}
        locations={[0, 0.4, 0.66, 1]} style={StyleSheet.absoluteFill} />
        : <View style={styles.scrim} />}
    </View>
  );
}

function ShorelineVideo({ active, onFailure }: { active: boolean; onFailure: () => void }) {
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [ready, setReady] = useState(false);
  // Baked overlap dissolve keeps the native single-player wrap continuous.
  const player = useVideoPlayer(require('../../../assets/onboarding/shoreline-smooth.mp4'), (video) => {
    video.loop = true;
    video.muted = true;
    video.volume = 0;
    video.audioMixingMode = 'mixWithOthers';
    video.staysActiveInBackground = false;
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') onFailure();
    });
    return () => subscription.remove();
  }, [onFailure, player]);
  useEffect(() => {
    if (active && appActive) player.play();
    else player.pause();
  }, [active, appActive, player]);
  return <VideoView player={player} nativeControls={false} contentFit="cover" onFirstFrameRender={() => setReady(true)} style={[styles.media, !ready && styles.waiting]} testID="onboarding.shoreline.video" />;
}

const styles = StyleSheet.create({
  media: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  waiting: { opacity: 0 },
  // A constant neutral veil keeps Sumi readable even over the darkest wave frame.
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.parchment, opacity: 0.82 },
});
