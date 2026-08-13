import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  applyNavigationOrientation,
  useNavigationOrientationPolicy,
} from './navigationOrientation';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mockLockAsync = jest.fn((_lock: string) => Promise.resolve());
const mockLockPlatformAsync = jest.fn((_lock: object) => Promise.resolve());
const mockUnlockAsync = jest.fn(() => Promise.resolve());

jest.mock('expo-screen-orientation', () => ({
  Orientation: {
    LANDSCAPE_LEFT: 'LANDSCAPE_LEFT',
    LANDSCAPE_RIGHT: 'LANDSCAPE_RIGHT',
    PORTRAIT_UP: 'PORTRAIT_UP',
  },
  OrientationLock: { LANDSCAPE: 'LANDSCAPE', PORTRAIT_UP: 'PORTRAIT_UP' },
  lockAsync: (lock: string) => mockLockAsync(lock),
  lockPlatformAsync: (lock: object) => mockLockPlatformAsync(lock),
  unlockAsync: () => mockUnlockAsync(),
}));

describe('navigation orientation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets cook mode follow the device in portrait or landscape', async () => {
    await applyNavigationOrientation('RecipeCookMode');

    expect(mockUnlockAsync).toHaveBeenCalledTimes(1);
    expect(mockLockAsync).not.toHaveBeenCalled();
  });

  it('lets the Food container defer to its child screen orientation', async () => {
    await applyNavigationOrientation('Food');

    expect(mockUnlockAsync).toHaveBeenCalledTimes(1);
    expect(mockLockAsync).not.toHaveBeenCalled();
  });

  it('keeps every other route portrait', async () => {
    await applyNavigationOrientation('RecipeHome');

    expect(mockLockAsync).toHaveBeenCalledWith('PORTRAIT_UP');
    expect(mockUnlockAsync).not.toHaveBeenCalled();
  });

  it('lets an active video Focus session follow the device', async () => {
    await applyNavigationOrientation('Today', { focusVideoActive: true });

    expect(mockLockPlatformAsync).toHaveBeenCalledWith({
      screenOrientationArrayIOS: ['PORTRAIT_UP', 'LANDSCAPE_LEFT', 'LANDSCAPE_RIGHT'],
    });
    expect(mockLockAsync).not.toHaveBeenCalled();
  });

  it('serializes Focus policy changes through one root owner and restores portrait', async () => {
    let resolveInitialPortrait: (() => void) | undefined;
    mockLockAsync.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveInitialPortrait = resolve;
    }));

    const { rerender } = renderHook<void, { focusVideoActive: boolean }>(
      ({ focusVideoActive }) => useNavigationOrientationPolicy({
        ready: true,
        routeName: 'Today',
        focusVideoActive,
      }),
      { initialProps: { focusVideoActive: false } },
    );

    expect(mockLockAsync).toHaveBeenCalledWith('PORTRAIT_UP');

    rerender({ focusVideoActive: true });
    expect(mockLockPlatformAsync).not.toHaveBeenCalled();

    await act(async () => {
      resolveInitialPortrait?.();
    });
    await waitFor(() => expect(mockLockPlatformAsync).toHaveBeenCalledTimes(1));

    rerender({ focusVideoActive: false });
    await waitFor(() => expect(mockLockAsync).toHaveBeenCalledTimes(2));
    expect(mockLockAsync).toHaveBeenLastCalledWith('PORTRAIT_UP');
  });

  it('keeps orientation ownership out of the Cook Mode screen', () => {
    const source = readFileSync(
      resolve(__dirname, '../capabilities/recipes/screens/RecipeCookModeScreen.tsx'),
      'utf8',
    );

    expect(source).not.toContain('useCookModeOrientation');
  });
});
