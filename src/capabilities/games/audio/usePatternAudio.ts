import { useCallback, useEffect, useMemo, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { HapticsService } from '../../../services/HapticsService';
import type { PatternBeatId } from '@/src/capabilities/games/domain/passPattern';

const beatOrder: PatternBeatId[] = ['coral', 'pine', 'gold', 'sky', 'violet', 'rose'];
const beatRates = [0.72, 0.88, 1.04, 1.2, 1.4, 1.58];

export function usePatternAudio(soundEnabled = true) {
  const coral = useAudioPlayer(require('../../../../assets/games/success-sparkle.wav'));
  const turmeric = useAudioPlayer(require('../../../../assets/games/success-sparkle.wav'));
  const pine = useAudioPlayer(require('../../../../assets/games/success-sparkle.wav'));
  const sky = useAudioPlayer(require('../../../../assets/games/success-sparkle.wav'));
  const violet = useAudioPlayer(require('../../../../assets/games/success-sparkle.wav'));
  const rose = useAudioPlayer(require('../../../../assets/games/success-sparkle.wav'));
  const win = useAudioPlayer(require('../../../../assets/games/doubles-celebration.wav'));
  const miss = useAudioPlayer(require('../../../../assets/games/failure-bonk.wav'));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const voices = useMemo(() => ({ coral, pine, gold: turmeric, sky, violet, rose }), [coral, pine, rose, sky, turmeric, violet]);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    beatOrder.forEach((id, index) => {
      voices[id].volume = 0.48;
      voices[id].shouldCorrectPitch = false;
      voices[id].setPlaybackRate(beatRates[index]);
    });
    win.volume = 0.58;
    miss.volume = 0.56;
    return () => timers.current.forEach(clearTimeout);
  }, [miss, voices, win]);

  const replay = useCallback(async (player: typeof coral) => {
    if (!soundEnabled) return;
    await player.seekTo(0);
    player.play();
  }, [coral, soundEnabled]);

  const beat = useCallback(async (id: PatternBeatId, haptic = true) => {
    if (haptic) void HapticsService.trigger('canvas.selection');
    try { await replay(voices[id]); } catch { /* Audio never blocks the game. */ }
  }, [replay, voices]);

  const sequence = useCallback((pattern: PatternBeatId[], options: { spacingMs?: number; onActiveBeat?: (id: PatternBeatId | null, index: number | null) => void; onComplete?: () => void } = {}) => {
    timers.current.forEach(clearTimeout);
    const spacingMs = options.spacingMs ?? 520;
    timers.current = pattern.map((id, index) => setTimeout(() => {
      options.onActiveBeat?.(id, index);
      void beat(id, false);
    }, 180 + index * spacingMs));
    timers.current.push(setTimeout(() => {
      options.onActiveBeat?.(null, null);
      options.onComplete?.();
    }, 180 + pattern.length * spacingMs));
  }, [beat]);
  const stopSequence = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const success = useCallback(async () => {
    void HapticsService.trigger('outcome.success');
    try { await replay(win); } catch { /* Audio never blocks the game. */ }
  }, [replay, win]);

  const failure = useCallback(async () => {
    void HapticsService.trigger('outcome.error');
    try { await replay(miss); } catch { /* Audio never blocks the game. */ }
  }, [miss, replay]);

  return useMemo(() => ({ beat, sequence, stopSequence, success, failure }), [beat, failure, sequence, stopSequence, success]);
}
