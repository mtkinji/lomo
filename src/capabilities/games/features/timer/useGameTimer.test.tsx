import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import {
  GAME_TIMER_DURATION_MS,
  createGameTimerState,
  readGameTimer,
  resetGameTimer,
  startGameTimer,
  useGameTimer,
} from './useGameTimer';

describe('game timer state', () => {
  it('starts one exact minute from the supplied wall clock', () => {
    expect(startGameTimer(createGameTimerState(), 12_000, 120_000)).toEqual({
      phase: 'running',
      deadlineMs: 132_000,
      durationMs: 120_000,
      remainingMs: 120_000,
    });
  });

  it('derives remaining time from the deadline instead of accumulated ticks', () => {
    const running = startGameTimer(createGameTimerState(), 5_000, GAME_TIMER_DURATION_MS);
    expect(readGameTimer(running, 35_250)).toMatchObject({ phase: 'running', remainingMs: 29_750 });
    expect(readGameTimer(running, 99_000)).toMatchObject({ phase: 'finished', remainingMs: 0, deadlineMs: null });
  });

  it('resets any state to a clean minute', () => {
    expect(resetGameTimer(startGameTimer(createGameTimerState(), 0, 30_000))).toEqual(createGameTimerState());
  });
});

describe('useGameTimer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reconciles against the clock when the app becomes active', () => {
    let now = 1_000;
    let onAppStateChange: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      onAppStateChange = listener as (state: string) => void;
      return { remove: jest.fn() };
    });
    const { result } = renderHook(() => useGameTimer({ now: () => now }));
    act(() => result.current.start(60_000));
    now += 60_500;
    act(() => onAppStateChange?.('active'));
    expect(result.current).toMatchObject({ phase: 'finished', remainingSeconds: 0, progress: 0 });
  });
});
