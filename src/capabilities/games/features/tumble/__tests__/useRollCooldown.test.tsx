import { act, renderHook } from '@testing-library/react-native';
import { BANK_ROLL_COOLDOWN_SECONDS, bankRollButtonLabel, bankRollCooldownRemaining, useRollCooldown } from '../useRollCooldown';

const players = (banked: boolean[]) => banked.map((isBanked, index) => ({
  id: index + 1,
  name: `Player ${index + 1}`,
  score: 0,
  banked: isBanked,
}));

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

describe('Bank cooldown policy', () => {
  test('keeps the in-flow pause to two seconds at most', () => {
    expect(BANK_ROLL_COOLDOWN_SECONDS).toBe(2);
  });
});

describe('bankRollCooldownRemaining', () => {
  test.each([0, 1, 2])('skips the cooldown before safe roll %i has been completed', (rollInRound) => {
    expect(bankRollCooldownRemaining({ rollInRound, players: players([false, false, false]) }, 3)).toBe(0);
  });

  test('starts the cooldown after the third safe roll when multiple rollers remain', () => {
    expect(bankRollCooldownRemaining({ rollInRound: 3, players: players([false, false, false]) }, 3)).toBe(3);
  });

  test('skips an active cooldown when only one unbanked roller remains', () => {
    expect(bankRollCooldownRemaining({ rollInRound: 6, players: players([true, false, true]) }, 2)).toBe(0);
  });
});
