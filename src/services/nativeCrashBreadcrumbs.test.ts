import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadNativeCrashBreadcrumbs,
  nativeCrashErrorMessage,
  NATIVE_CRASH_BREADCRUMB_STORAGE_KEY,
  recordNativeCrashBreadcrumb,
} from './nativeCrashBreadcrumbs';

describe('nativeCrashBreadcrumbs', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('persists sanitized native boundary breadcrumbs in order', async () => {
    await recordNativeCrashBreadcrumb({
      atIso: '2026-06-05T10:00:00.000Z',
      area: 'focus.soundscape',
      operation: 'Audio.Sound.createAsync',
      phase: 'before',
      context: {
        soundscapeId: 'focusFlowState',
        ignored: undefined,
        nested: { ok: true },
      },
    });
    await recordNativeCrashBreadcrumb({
      atIso: '2026-06-05T10:00:01.000Z',
      area: 'focus.soundscape',
      operation: 'Audio.Sound.createAsync',
      phase: 'after',
    });

    await expect(loadNativeCrashBreadcrumbs()).resolves.toEqual([
      {
        atIso: '2026-06-05T10:00:00.000Z',
        area: 'focus.soundscape',
        operation: 'Audio.Sound.createAsync',
        phase: 'before',
        context: {
          soundscapeId: 'focusFlowState',
          nested: { ok: true },
        },
      },
      {
        atIso: '2026-06-05T10:00:01.000Z',
        area: 'focus.soundscape',
        operation: 'Audio.Sound.createAsync',
        phase: 'after',
      },
    ]);
  });

  it('keeps a bounded ring buffer of the most recent breadcrumbs', async () => {
    for (let i = 0; i < 55; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await recordNativeCrashBreadcrumb({
        atIso: `2026-06-05T10:00:${String(i).padStart(2, '0')}.000Z`,
        area: 'focus.liveActivity',
        operation: `operation-${i}`,
        phase: 'before',
      });
    }

    const stored = await loadNativeCrashBreadcrumbs();
    expect(stored).toHaveLength(50);
    expect(stored[0].operation).toBe('operation-5');
    expect(stored[49].operation).toBe('operation-54');
  });

  it('does not throw when persisted data or writes fail', async () => {
    await AsyncStorage.setItem(NATIVE_CRASH_BREADCRUMB_STORAGE_KEY, '{not-json');
    await expect(loadNativeCrashBreadcrumbs()).resolves.toEqual([]);

    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(
      recordNativeCrashBreadcrumb({
        area: 'focus.session',
        operation: 'Notifications.scheduleNotificationAsync.focusComplete',
        phase: 'before',
      }),
    ).resolves.toBeUndefined();
    setItemSpy.mockRestore();
  });

  it('formats unknown native errors without throwing', () => {
    expect(nativeCrashErrorMessage(new Error('native boom'))).toBe('Error: native boom');
    expect(nativeCrashErrorMessage('plain native boom')).toBe('plain native boom');
  });
});
