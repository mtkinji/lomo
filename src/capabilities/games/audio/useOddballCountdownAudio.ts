import { useCallback, useEffect, useMemo } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { audioGainForCategory } from './audioGainPolicy';

export function useOddballCountdownAudio(enabled: boolean) {
  const countPlayer = useAudioPlayer(require('../../../../assets/audio/sfx/list-tap.wav'));
  const revealPlayer = useAudioPlayer(require('../../../../assets/audio/sfx/mark-complete.wav'));

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    countPlayer.volume = audioGainForCategory('ui.micro');
    revealPlayer.volume = Math.min(1, audioGainForCategory('game.mechanic') * 1.15);
  }, [countPlayer, revealPlayer]);

  const replay = useCallback(async (player: typeof countPlayer) => {
    if (!enabled) return;
    try {
      await player.seekTo(0);
      player.play();
    } catch {
      // The visible countdown remains authoritative if audio is unavailable.
    }
  }, [countPlayer, enabled]);

  return useMemo(() => ({
    count: () => replay(countPlayer),
    reveal: () => replay(revealPlayer),
  }), [countPlayer, replay, revealPlayer]);
}
