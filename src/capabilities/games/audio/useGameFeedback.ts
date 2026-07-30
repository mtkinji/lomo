import { useCallback, useEffect, useMemo, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { HapticsService } from '../../../services/HapticsService';
import type { FailureSoundId, SuccessSoundId } from '@/src/capabilities/games/players/playerIdentity';

export function shouldPlayFailureCue(nextStatus: 'playing' | 'finished') {
  return nextStatus === 'playing';
}

export function useGameFeedback(soundOn: boolean) {
  const rollPlayer = useAudioPlayer(require('../../../../assets/games/dice-roll.mp3'), { downloadFirst: true });
  const rollPlayerTwo = useAudioPlayer(require('../../../../assets/games/dice-roll-2.mp3'), { downloadFirst: true });
  const rollPlayerThree = useAudioPlayer(require('../../../../assets/games/dice-roll-3.mp3'), { downloadFirst: true });
  const successChime = useAudioPlayer(require('../../../../assets/games/doubles-celebration.wav'));
  const successSparkle = useAudioPlayer(require('../../../../assets/games/success-sparkle.wav'));
  const successFanfare = useAudioPlayer(require('../../../../assets/games/success-fanfare.wav'));
  const successHawk = useAudioPlayer(require('../../../../assets/games/success-hawk.mp3'));
  const failureTrombone = useAudioPlayer(require('../../../../assets/games/bank-bust.wav'));
  const failureBonk = useAudioPlayer(require('../../../../assets/games/failure-bonk.wav'));
  const failureWobble = useAudioPlayer(require('../../../../assets/games/failure-wobble.wav'));
  const rollPlayers = useMemo(() => [rollPlayer, rollPlayerTwo, rollPlayerThree], [rollPlayer, rollPlayerThree, rollPlayerTwo]);
  const nextRollIndex = useRef(0);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
    rollPlayers.forEach((player) => { player.volume = 0.82; });
    [successChime, successSparkle, successFanfare].forEach((player) => { player.volume = 0.68; });
    // The hawk is a short field recording and is meant to own the victory moment.
    successHawk.volume = 0.88;
    [failureTrombone, failureBonk, failureWobble].forEach((player) => { player.volume = 0.72; });
  }, [failureBonk, failureTrombone, failureWobble, rollPlayers, successChime, successFanfare, successHawk, successSparkle]);

  const replay = useCallback(async (player: typeof rollPlayer) => {
    if (!soundOn) return;
    await player.seekTo(0);
    player.play();
  }, [rollPlayer, soundOn]);

  const roll = useCallback(async () => {
    void HapticsService.trigger('canvas.primary.confirm');
    try {
      const player = rollPlayers[nextRollIndex.current];
      nextRollIndex.current = (nextRollIndex.current + 1) % rollPlayers.length;
      await replay(player);
    } catch {
      // Sound is delight, never a gate to play.
    }
  }, [replay, rollPlayers]);
  const success = useCallback(async (soundId: SuccessSoundId = 'chime') => {
    void HapticsService.trigger('outcome.success');
    try {
      await replay(soundId === 'sparkle' ? successSparkle : soundId === 'fanfare' ? successFanfare : soundId === 'hawk' ? successHawk : successChime);
    } catch {
      // Sound is delight, never a gate to play.
    }
  }, [replay, successChime, successFanfare, successHawk, successSparkle]);
  const failure = useCallback(async (soundId: FailureSoundId = 'trombone') => {
    void HapticsService.trigger('outcome.error');
    try {
      await replay(soundId === 'bonk' ? failureBonk : soundId === 'wobble' ? failureWobble : failureTrombone);
    } catch {
      // Sound is delight, never a gate to play.
    }
  }, [failureBonk, failureTrombone, failureWobble, replay]);
  const select = useCallback(() => void HapticsService.trigger('canvas.selection'), []);

  return useMemo(() => ({ roll, success, failure, select }), [failure, roll, select, success]);
}
