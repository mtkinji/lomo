import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import {
  nearestGrooveBeatOffsetMs,
  patternGrooves,
  type PatternGrooveId,
} from '@/src/capabilities/games/domain/passPatternRhythm';
import { audioGainForCategory } from './audioGainPolicy';

const LOOP_START_PHASE_BEATS = 0.65;
const FIRST_DOWNBEAT_DELAY_BEATS = 1 - LOOP_START_PHASE_BEATS;

export function usePatternGroove(grooveId: PatternGrooveId, soundEnabled = true) {
  const funk = useAudioPlayer(require('../../../../assets/games/music/pattern-funk.wav'));
  const jazz = useAudioPlayer(require('../../../../assets/games/music/pattern-jazz.wav'));
  const rock = useAudioPlayer(require('../../../../assets/games/music/pattern-rock.wav'));
  const blues = useAudioPlayer(require('../../../../assets/games/music/pattern-blues.wav'));
  const players = useMemo(() => ({ funk, jazz, rock, blues }), [blues, funk, jazz, rock]);
  const [beatIndex, setBeatIndex] = useState(3);
  const anchorAtMs = useRef(Date.now());

  useEffect(() => {
    const groove = patternGrooves[grooveId];
    const selected = players[grooveId];
    const firstDownbeatDelayMs = Math.round(groove.beatMs * FIRST_DOWNBEAT_DELAY_BEATS);
    anchorAtMs.current = Date.now() + firstDownbeatDelayMs;
    setBeatIndex(3);

    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    Object.values(players).forEach((player) => {
      player.pause();
      player.loop = false;
    });
    selected.loop = true;
    selected.volume = audioGainForCategory('game.music') * 0.72;
    if (soundEnabled) selected.play();

    let pulse = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    const firstPulse = setTimeout(() => {
      setBeatIndex(0);
      pulse = 1;
      interval = setInterval(() => {
        setBeatIndex(pulse % 4);
        pulse += 1;
      }, groove.beatMs);
    }, firstDownbeatDelayMs);

    return () => {
      clearTimeout(firstPulse);
      if (interval) clearInterval(interval);
      selected.pause();
      selected.loop = false;
      void selected.seekTo(0).catch(() => undefined);
    };
  }, [grooveId, players, soundEnabled]);

  const timingOffsetMs = useCallback((timestampMs: number) => (
    nearestGrooveBeatOffsetMs(timestampMs - anchorAtMs.current, patternGrooves[grooveId].beatMs)
  ), [grooveId]);

  const msUntilNextBeat = useCallback((timestampMs = Date.now()) => {
    const beatMs = patternGrooves[grooveId].beatMs;
    const elapsed = timestampMs - anchorAtMs.current;
    if (elapsed <= 0) return Math.round(-elapsed);
    const remainder = elapsed % beatMs;
    return Math.round(remainder === 0 ? 0 : beatMs - remainder);
  }, [grooveId]);

  return useMemo(() => ({ beatIndex, timingOffsetMs, msUntilNextBeat }), [beatIndex, msUntilNextBeat, timingOffsetMs]);
}
