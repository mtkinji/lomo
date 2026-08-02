import { useCallback, useEffect, useMemo, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { HapticsService } from '../../../services/HapticsService';
import type { FailureSoundId, SuccessSoundId } from '@/src/capabilities/games/players/playerIdentity';
import { audioGainForCategory } from './audioGainPolicy';

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
  const failureCartoonSplat = useAudioPlayer(require('../../../../assets/games/failure-cartoon-splat.mp3'));
  const successPowerLickOne = useAudioPlayer(require('../../../../assets/games/success-power-lick-1.mp3'));
  const successPowerLickTwo = useAudioPlayer(require('../../../../assets/games/success-power-lick-2.mp3'));
  const successPowerLickThree = useAudioPlayer(require('../../../../assets/games/success-power-lick-3.mp3'));
  const successBanjoRunOne = useAudioPlayer(require('../../../../assets/games/success-banjo-run-1.mp3'));
  const successTinyCrowdOne = useAudioPlayer(require('../../../../assets/games/success-tiny-crowd-1.mp3'));
  const successTinyCrowdTwo = useAudioPlayer(require('../../../../assets/games/success-tiny-crowd-2.mp3'));
  const successTinyCrowdThree = useAudioPlayer(require('../../../../assets/games/success-tiny-crowd-3.mp3'));
  const successTinyCrowdFour = useAudioPlayer(require('../../../../assets/games/success-tiny-crowd-4.mp3'));
  const bankCoinGatherOne = useAudioPlayer(require('../../../../assets/games/bank-coin-gather-1.mp3'));
  const bankCoinGatherThree = useAudioPlayer(require('../../../../assets/games/bank-coin-gather-3.mp3'));
  const doublesTinyCrowd = useAudioPlayer(require('../../../../assets/games/success-tiny-crowd-1.mp3'));
  const rollPlayers = useMemo(() => [rollPlayer, rollPlayerTwo, rollPlayerThree], [rollPlayer, rollPlayerThree, rollPlayerTwo]);
  const successPlayers = useMemo<Record<SuccessSoundId, typeof rollPlayer>>(() => ({
    chime: successChime,
    sparkle: successSparkle,
    fanfare: successFanfare,
    hawk: successHawk,
    'power-lick-1': successPowerLickOne,
    'power-lick-2': successPowerLickTwo,
    'power-lick-3': successPowerLickThree,
    'banjo-run-1': successBanjoRunOne,
    'tiny-crowd-1': successTinyCrowdOne,
    'tiny-crowd-2': successTinyCrowdTwo,
    'tiny-crowd-3': successTinyCrowdThree,
    'tiny-crowd-4': successTinyCrowdFour,
  }), [successBanjoRunOne, successChime, successFanfare, successHawk, successPowerLickOne, successPowerLickThree, successPowerLickTwo, successSparkle, successTinyCrowdFour, successTinyCrowdOne, successTinyCrowdThree, successTinyCrowdTwo]);
  const nextRollIndex = useRef(0);
  const nextBankIndex = useRef(0);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
    rollPlayers.forEach((player) => { player.volume = audioGainForCategory('game.mechanic'); });
    [successChime, successSparkle, successFanfare].forEach((player) => { player.volume = 0.68; });
    // The hawk is a short field recording and is meant to own the victory moment.
    successHawk.volume = 0.88;
    [
      successPowerLickOne,
      successPowerLickTwo,
      successPowerLickThree,
      successBanjoRunOne,
      successTinyCrowdOne,
      successTinyCrowdTwo,
      successTinyCrowdThree,
      successTinyCrowdFour,
    ].forEach((player) => { player.volume = audioGainForCategory('game.signature'); });
    [failureTrombone, failureBonk, failureWobble, failureCartoonSplat].forEach((player) => {
      player.volume = audioGainForCategory('game.signature');
    });
    [bankCoinGatherOne, bankCoinGatherThree].forEach((player) => {
      player.volume = audioGainForCategory('game.mechanic');
    });
    doublesTinyCrowd.volume = audioGainForCategory('game.mechanic') * 0.8;
  }, [bankCoinGatherOne, bankCoinGatherThree, doublesTinyCrowd, failureBonk, failureCartoonSplat, failureTrombone, failureWobble, rollPlayers, successBanjoRunOne, successChime, successFanfare, successHawk, successPowerLickOne, successPowerLickThree, successPowerLickTwo, successSparkle, successTinyCrowdFour, successTinyCrowdOne, successTinyCrowdThree, successTinyCrowdTwo]);

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
      await replay(successPlayers[soundId]);
    } catch {
      // Sound is delight, never a gate to play.
    }
  }, [replay, successPlayers]);
  const bank = useCallback(async () => {
    void HapticsService.trigger('outcome.success');
    try {
      const players = [bankCoinGatherOne, bankCoinGatherThree];
      const player = players[nextBankIndex.current];
      nextBankIndex.current = (nextBankIndex.current + 1) % players.length;
      await replay(player);
    } catch {
      // Sound is delight, never a gate to play.
    }
  }, [bankCoinGatherOne, bankCoinGatherThree, replay]);
  const doubles = useCallback(async () => {
    void HapticsService.trigger('outcome.success');
    try {
      await replay(doublesTinyCrowd);
    } catch {
      // Sound is delight, never a gate to play.
    }
  }, [doublesTinyCrowd, replay]);
  const failure = useCallback(async (soundId: FailureSoundId = 'trombone') => {
    void HapticsService.trigger('outcome.error');
    try {
      await replay(
        soundId === 'bonk'
          ? failureBonk
          : soundId === 'wobble'
            ? failureWobble
            : soundId === 'cartoon-splat'
              ? failureCartoonSplat
              : failureTrombone,
      );
    } catch {
      // Sound is delight, never a gate to play.
    }
  }, [failureBonk, failureCartoonSplat, failureTrombone, failureWobble, replay]);
  const select = useCallback(() => void HapticsService.trigger('canvas.selection'), []);

  return useMemo(() => ({ roll, success, failure, bank, doubles, select }), [bank, doubles, failure, roll, select, success]);
}
