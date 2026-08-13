import { useCallback, useEffect, useMemo, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { HapticsService } from '../../../services/HapticsService';
import type { PatternBeatId } from '@/src/capabilities/games/domain/passPattern';
import { PATTERN_NOTE_DURATION_MS } from '@/src/capabilities/games/domain/passPatternRhythm';
import { audioGainForCategory } from './audioGainPolicy';

const beatOrder: PatternBeatId[] = ['coral', 'pine', 'gold', 'sky', 'violet', 'rose'];

export function usePatternAudio(soundEnabled = true) {
  const coralA = useAudioPlayer(require('../../../../assets/games/pattern-coral.mp3'));
  const coralB = useAudioPlayer(require('../../../../assets/games/pattern-coral.mp3'));
  const pineA = useAudioPlayer(require('../../../../assets/games/pattern-pine.mp3'));
  const pineB = useAudioPlayer(require('../../../../assets/games/pattern-pine.mp3'));
  const goldA = useAudioPlayer(require('../../../../assets/games/pattern-gold.mp3'));
  const goldB = useAudioPlayer(require('../../../../assets/games/pattern-gold.mp3'));
  const skyA = useAudioPlayer(require('../../../../assets/games/pattern-sky.mp3'));
  const skyB = useAudioPlayer(require('../../../../assets/games/pattern-sky.mp3'));
  const violetA = useAudioPlayer(require('../../../../assets/games/pattern-violet.mp3'));
  const violetB = useAudioPlayer(require('../../../../assets/games/pattern-violet.mp3'));
  const roseA = useAudioPlayer(require('../../../../assets/games/pattern-rose.mp3'));
  const roseB = useAudioPlayer(require('../../../../assets/games/pattern-rose.mp3'));
  const win = useAudioPlayer(require('../../../../assets/games/doubles-celebration.wav'));
  const miss = useAudioPlayer(require('../../../../assets/games/pattern-miss.mp3'));
  const sequenceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const resetTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextVoice = useRef<Record<PatternBeatId, number>>({ coral: 0, pine: 0, gold: 0, sky: 0, violet: 0, rose: 0 });
  const voices = useMemo(() => ({
    coral: [coralA, coralB],
    pine: [pineA, pineB],
    gold: [goldA, goldB],
    sky: [skyA, skyB],
    violet: [violetA, violetB],
    rose: [roseA, roseB],
  }), [coralA, coralB, goldA, goldB, pineA, pineB, roseA, roseB, skyA, skyB, violetA, violetB]);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    beatOrder.forEach((id) => voices[id].forEach((voice) => {
      voice.volume = audioGainForCategory('game.pattern');
    }));
    win.volume = 0.58;
    miss.volume = 0.56;
    return () => [...sequenceTimers.current, ...resetTimers.current].forEach(clearTimeout);
  }, [miss, voices, win]);

  const replay = useCallback(async (player: typeof win) => {
    if (!soundEnabled) return;
    await player.seekTo(0);
    player.play();
  }, [soundEnabled]);

  const beat = useCallback((id: PatternBeatId, haptic = true) => {
    if (haptic) void HapticsService.trigger('canvas.selection');
    if (!soundEnabled) return;
    const voiceIndex = nextVoice.current[id];
    nextVoice.current[id] = (voiceIndex + 1) % voices[id].length;
    const voice = voices[id][voiceIndex];
    voice.play();
    const resetTimer = setTimeout(() => {
      voice.pause();
      void voice.seekTo(0).catch(() => undefined);
      resetTimers.current = resetTimers.current.filter((timer) => timer !== resetTimer);
    }, PATTERN_NOTE_DURATION_MS + 20);
    resetTimers.current.push(resetTimer);
  }, [soundEnabled, voices]);

  const sequence = useCallback((pattern: PatternBeatId[], options: { spacingMs?: number; startDelayMs?: number; onActiveBeat?: (id: PatternBeatId | null, index: number | null) => void; onComplete?: () => void } = {}) => {
    sequenceTimers.current.forEach(clearTimeout);
    const spacingMs = options.spacingMs ?? 520;
    const startDelayMs = options.startDelayMs ?? 180;
    sequenceTimers.current = pattern.map((id, index) => setTimeout(() => {
      options.onActiveBeat?.(id, index);
      beat(id, false);
    }, startDelayMs + index * spacingMs));
    sequenceTimers.current.push(setTimeout(() => {
      options.onActiveBeat?.(null, null);
      options.onComplete?.();
    }, startDelayMs + pattern.length * spacingMs));
  }, [beat]);
  const stopSequence = useCallback(() => {
    sequenceTimers.current.forEach(clearTimeout);
    sequenceTimers.current = [];
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
