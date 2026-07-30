import { act, renderHook } from '@testing-library/react-native';
import { bankRollButtonLabel, useRollCooldown } from '../useRollCooldown';

describe('bankRollButtonLabel', () => {
  test('shows the roll, rolling, and countdown states in the button', () => {
    expect(bankRollButtonLabel(false, 0)).toBe('Roll');
    expect(bankRollButtonLabel(true, 0)).toBe('Rolling…');
    expect(bankRollButtonLabel(false, 3)).toBe('Roll in 3');
    expect(bankRollButtonLabel(false, 1)).toBe('Roll in 1');
  });
});

describe('useRollCooldown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('counts down once per second after it starts', () => {
    const { result } = renderHook(() => useRollCooldown(3));

    expect(result.current.remainingSeconds).toBe(0);

    act(() => result.current.start());
    expect(result.current.remainingSeconds).toBe(3);

    act(() => jest.advanceTimersByTime(1_000));
    expect(result.current.remainingSeconds).toBe(2);

    act(() => jest.advanceTimersByTime(2_000));
    expect(result.current.remainingSeconds).toBe(0);
  });

  test('can be reset when a new game starts', () => {
    const { result } = renderHook(() => useRollCooldown(3));

    act(() => result.current.start());
    act(() => result.current.reset());
    act(() => jest.advanceTimersByTime(3_000));

    expect(result.current.remainingSeconds).toBe(0);
  });
});
