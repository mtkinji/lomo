import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

export const GAME_TIMER_DURATION_MS = 60_000;
const TICK_MS = 100;

export type GameTimerState = {
  phase: 'ready' | 'running' | 'finished';
  deadlineMs: number | null;
  durationMs: number;
  remainingMs: number;
};

export function createGameTimerState(): GameTimerState {
  return { phase: 'ready', deadlineMs: null, durationMs: GAME_TIMER_DURATION_MS, remainingMs: GAME_TIMER_DURATION_MS };
}

export function startGameTimer(_state: GameTimerState, nowMs: number, durationMs: number): GameTimerState {
  return { phase: 'running', deadlineMs: nowMs + durationMs, durationMs, remainingMs: durationMs };
}

export function readGameTimer(state: GameTimerState, nowMs: number): GameTimerState {
  if (state.phase !== 'running' || state.deadlineMs === null) return state;
  const remainingMs = Math.max(0, state.deadlineMs - nowMs);
  return remainingMs === 0
    ? { ...state, phase: 'finished', deadlineMs: null, remainingMs: 0 }
    : { ...state, remainingMs };
}

export function resetGameTimer(_state: GameTimerState): GameTimerState {
  return createGameTimerState();
}

export function useGameTimer({ now = Date.now }: { now?: () => number } = {}) {
  const [state, setState] = useState(createGameTimerState);
  const tick = useCallback(() => setState((current) => readGameTimer(current, now())), [now]);

  useEffect(() => {
    if (state.phase !== 'running') return undefined;
    const interval = setInterval(tick, TICK_MS);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') tick();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [state.phase, tick]);

  const start = useCallback((durationMs: number) => setState((current) => startGameTimer(current, now(), durationMs)), [now]);
  const reset = useCallback(() => setState((current) => resetGameTimer(current)), []);
  const remainingSeconds = Math.ceil(state.remainingMs / 1000);
  const progress = state.remainingMs / state.durationMs;

  return useMemo(() => ({ ...state, remainingSeconds, progress, start, reset }), [progress, remainingSeconds, reset, start, state]);
}
