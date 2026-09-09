import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { usePlanClock } from './usePlanClock';

let mockFocus: () => void;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => { mockFocus = callback; },
}));

describe('usePlanClock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-08T11:05:00-06:00'));
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('advances while Plan remains open and cleans up its timer', () => {
    const { result, unmount } = renderHook(() => usePlanClock());
    act(() => jest.advanceTimersByTime(30_000));
    expect(result.current).toEqual(new Date('2026-09-08T11:05:30-06:00'));
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('refreshes immediately on foreground and screen focus', () => {
    const listener = jest.spyOn(AppState, 'addEventListener');
    listener.mockClear();
    const { result } = renderHook(() => usePlanClock());
    jest.setSystemTime(new Date('2026-09-08T12:05:00-06:00'));
    act(() => listener.mock.calls[0]?.[1]('active'));
    expect(result.current).toEqual(new Date('2026-09-08T12:05:00-06:00'));
    jest.setSystemTime(new Date('2026-09-08T13:05:00-06:00'));
    act(() => mockFocus());
    expect(result.current).toEqual(new Date('2026-09-08T13:05:00-06:00'));
  });
});
