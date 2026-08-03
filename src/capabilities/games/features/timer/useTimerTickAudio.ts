import { useCallback, useEffect } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

export function useTimerTickAudio(enabled: boolean) {
  const player = useAudioPlayer(require('../../../../../assets/audio/sfx/list-tap.wav'));

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    player.volume = 0.12;
  }, [player]);

  return useCallback(async () => {
    if (!enabled) return;
    try {
      await player.seekTo(0);
      player.play();
    } catch {
      // The clock remains authoritative if audio is unavailable.
    }
  }, [enabled, player]);
}
