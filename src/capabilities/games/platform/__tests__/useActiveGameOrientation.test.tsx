import { renderHook } from '@testing-library/react-native';
import { useActiveGameOrientation } from '../useActiveGameOrientation';

const mockLockAsync = jest.fn((_lock: string) => Promise.resolve());
const mockUnlockAsync = jest.fn(() => Promise.resolve());

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { PORTRAIT_UP: 'PORTRAIT_UP' },
  lockAsync: (lock: string) => mockLockAsync(lock),
  unlockAsync: () => mockUnlockAsync(),
}));

describe('useActiveGameOrientation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unlocks rotation only during active play and restores portrait afterward', () => {
    const { rerender, unmount } = renderHook<void, { active: boolean }>(
      ({ active }) => useActiveGameOrientation(active),
      { initialProps: { active: false } },
    );
    expect(mockLockAsync).toHaveBeenCalledWith('PORTRAIT_UP');
    expect(mockUnlockAsync).not.toHaveBeenCalled();

    rerender({ active: true });
    expect(mockUnlockAsync).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockLockAsync).toHaveBeenCalledTimes(3);
  });
});
