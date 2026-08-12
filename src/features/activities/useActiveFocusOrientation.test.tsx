import { renderHook } from '@testing-library/react-native';
import { useActiveFocusOrientation } from './useActiveFocusOrientation';

const mockLockAsync = jest.fn((_lock: string) => Promise.resolve());
const mockUnlockAsync = jest.fn(() => Promise.resolve());

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { PORTRAIT_UP: 'PORTRAIT_UP' },
  lockAsync: (lock: string) => mockLockAsync(lock),
  unlockAsync: () => mockUnlockAsync(),
}));

describe('useActiveFocusOrientation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unlocks rotation only for an active video environment and restores portrait afterward', () => {
    const { rerender, unmount } = renderHook<void, { active: boolean }>(
      ({ active }) => useActiveFocusOrientation(active),
      { initialProps: { active: false } },
    );

    expect(mockLockAsync).toHaveBeenCalledWith('PORTRAIT_UP');
    expect(mockUnlockAsync).not.toHaveBeenCalled();

    rerender({ active: true });
    expect(mockUnlockAsync).toHaveBeenCalledTimes(1);

    rerender({ active: false });
    expect(mockLockAsync).toHaveBeenCalledTimes(4);

    unmount();
    expect(mockLockAsync).toHaveBeenCalledTimes(5);
  });
});
