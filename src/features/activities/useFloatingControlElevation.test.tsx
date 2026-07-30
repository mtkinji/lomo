import { act, renderHook } from '@testing-library/react-native';
import {
  FLOATING_CONTROL_SETTLE_DELAY_MS,
  useFloatingControlElevation,
} from './useFloatingControlElevation';

describe('useFloatingControlElevation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts prominent, quiets while scrolling, and restores after the settle delay', () => {
    const { result } = renderHook(() => useFloatingControlElevation());

    expect(result.current.isProminent).toBe(true);

    act(() => result.current.markScrolling());
    expect(result.current.isProminent).toBe(false);

    act(() => result.current.markSettled());
    act(() => jest.advanceTimersByTime(FLOATING_CONTROL_SETTLE_DELAY_MS - 1));
    expect(result.current.isProminent).toBe(false);

    act(() => jest.advanceTimersByTime(1));
    expect(result.current.isProminent).toBe(true);
  });

  it('cancels a pending restore when scrolling resumes', () => {
    const { result } = renderHook(() => useFloatingControlElevation());

    act(() => result.current.markScrolling());
    act(() => result.current.markSettled());
    act(() => jest.advanceTimersByTime(FLOATING_CONTROL_SETTLE_DELAY_MS / 2));
    act(() => result.current.markScrolling());
    act(() => jest.advanceTimersByTime(FLOATING_CONTROL_SETTLE_DELAY_MS));

    expect(result.current.isProminent).toBe(false);
  });

  it('can reset immediately to the stationary state', () => {
    const { result } = renderHook(() => useFloatingControlElevation());

    act(() => result.current.markScrolling());
    expect(result.current.isProminent).toBe(false);

    act(() => result.current.reset());
    expect(result.current.isProminent).toBe(true);
  });
});
