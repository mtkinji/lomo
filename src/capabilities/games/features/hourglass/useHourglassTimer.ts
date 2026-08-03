import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

export const HOURGLASS_DURATION_MS = 60_000;
const TICK_MS = 100;

export type HourglassTimerState = {
  phase: 'ready' | 'running' | 'finished';
  deadlineMs: number | null;
  remainingMs: number;
};

export function createHourglassTimerState(): HourglassTimerState {
  return { phase: 'ready', deadlineMs: null, remainingMs: HOURGLASS_DURATION_MS };
}

export function startHourglassTimer(_state: HourglassTimerState, nowMs: number): HourglassTimerState {
  return {
    phase: 'running',
    deadlineMs: nowMs + HOURGLASS_DURATION_MS,
    remainingMs: HOURGLASS_DURATION_MS,
  };
}

export function readHourglassTimer(state: HourglassTimerState, nowMs: number): HourglassTimerState {
  if (state.phase !== 'running' || state.deadlineMs === null) return state;
  const remainingMs = Math.max(0, state.deadlineMs - nowMs);
  if (remainingMs === 0) return { phase: 'finished', deadlineMs: null, remainingMs: 0 };
  return { ...state, remainingMs };
}

export function resetHourglassTimer(_state: HourglassTimerState): HourglassTimerState {
  return createHourglassTimerState();
}

type UseHourglassTimerOptions = {
  now?: () => number;
};

export function useHourglassTimer({ now = Date.now }: UseHourglassTimerOptions = {}) {
  const [state, setState] = useState(createHourglassTimerState);
  const tick = useCallback(() => {
    setState((current) => readHourglassTimer(current, now()));
  }, [now]);

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

  const start = useCallback(() => {
    setState((current) => startHourglassTimer(current, now()));
  }, [now]);
  const reset = useCallback(() => setState((current) => resetHourglassTimer(current)), []);
  const remainingSeconds = Math.ceil(state.remainingMs / 1000);
  const progress = state.remainingMs / HOURGLASS_DURATION_MS;

  return useMemo(() => ({
    ...state,
    remainingSeconds,
    progress,
    start,
    reset,
  }), [progress, remainingSeconds, reset, start, state]);
}
