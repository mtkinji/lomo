import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import {
  HOURGLASS_DURATION_MS,
  createHourglassTimerState,
  readHourglassTimer,
  resetHourglassTimer,
  startHourglassTimer,
  useHourglassTimer,
} from './useHourglassTimer';

describe('hourglass timer state', () => {
  it('starts one exact minute from the supplied wall clock', () => {
    const state = startHourglassTimer(createHourglassTimerState(), 12_000);

    expect(state).toEqual({
      phase: 'running',
      deadlineMs: 12_000 + HOURGLASS_DURATION_MS,
      remainingMs: HOURGLASS_DURATION_MS,
    });
  });

  it('derives remaining time from the deadline instead of accumulated ticks', () => {
    const running = startHourglassTimer(createHourglassTimerState(), 5_000);

    expect(readHourglassTimer(running, 35_250)).toMatchObject({
      phase: 'running',
      remainingMs: 29_750,
    });
    expect(readHourglassTimer(running, 99_000)).toMatchObject({
      phase: 'finished',
      remainingMs: 0,
      deadlineMs: null,
    });
  });

  it('resets any state to a clean full glass', () => {
    const running = startHourglassTimer(createHourglassTimerState(), 0);
    expect(resetHourglassTimer(running)).toEqual(createHourglassTimerState());
  });
});

describe('useHourglassTimer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reconciles against the clock when the app becomes active', () => {
    let now = 1_000;
    let onAppStateChange: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      onAppStateChange = listener as (state: string) => void;
      return { remove: jest.fn() };
    });

    const { result } = renderHook(() => useHourglassTimer({ now: () => now }));
    act(() => result.current.start());
    expect(result.current.phase).toBe('running');
    expect(result.current.remainingSeconds).toBe(60);

    now += 60_500;
    act(() => onAppStateChange?.('active'));

    expect(result.current.phase).toBe('finished');
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.progress).toBe(0);
  });
});
