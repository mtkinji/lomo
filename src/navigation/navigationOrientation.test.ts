import { applyNavigationOrientation } from './navigationOrientation';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mockLockAsync = jest.fn((_lock: string) => Promise.resolve());
const mockUnlockAsync = jest.fn(() => Promise.resolve());

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { LANDSCAPE: 'LANDSCAPE', PORTRAIT_UP: 'PORTRAIT_UP' },
  lockAsync: (lock: string) => mockLockAsync(lock),
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

  it('keeps orientation ownership out of the Cook Mode screen', () => {
    const source = readFileSync(
      resolve(__dirname, '../capabilities/recipes/screens/RecipeCookModeScreen.tsx'),
      'utf8',
    );

    expect(source).not.toContain('useCookModeOrientation');
  });
});
