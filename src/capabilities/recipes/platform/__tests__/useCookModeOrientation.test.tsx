import { renderHook } from '@testing-library/react-native';

import { useCookModeOrientation } from '../useCookModeOrientation';

const mockLockAsync = jest.fn((_lock: string) => Promise.resolve());

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => effect(),
}));
jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { LANDSCAPE: 'LANDSCAPE' },
  lockAsync: (lock: string) => mockLockAsync(lock),
}));

describe('useCookModeOrientation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('claims rotation after navigation focus settles', () => {
    const originalRequestAnimationFrame = global.requestAnimationFrame;
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame;

    renderHook(() => useCookModeOrientation());

    expect(mockLockAsync).toHaveBeenCalledWith('LANDSCAPE');
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });
});
