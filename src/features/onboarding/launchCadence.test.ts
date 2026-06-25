import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COMPACT_LAUNCH_SCREEN_DURATION_MS,
  FULL_LAUNCH_SCREEN_DURATION_MS,
  resolveLaunchScreenDuration,
  resolveLaunchScreenDurationForToday,
} from './launchCadence';

describe('resolveLaunchScreenDuration', () => {
  it('keeps the full brand moment when no launch has been recorded today', () => {
    expect(resolveLaunchScreenDuration(null, '2026-06-25')).toBe(FULL_LAUNCH_SCREEN_DURATION_MS);
    expect(resolveLaunchScreenDuration('2026-06-24', '2026-06-25')).toBe(FULL_LAUNCH_SCREEN_DURATION_MS);
  });

  it('uses the compact launch moment after the first launch of the local day', () => {
    expect(resolveLaunchScreenDuration('2026-06-25', '2026-06-25')).toBe(COMPACT_LAUNCH_SCREEN_DURATION_MS);
  });
});

describe('resolveLaunchScreenDurationForToday', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('records the first full launch so later launches on the same local day are compact', async () => {
    const morning = new Date(2026, 5, 25, 8, 0, 0);
    const afternoon = new Date(2026, 5, 25, 15, 30, 0);

    await expect(resolveLaunchScreenDurationForToday(morning)).resolves.toBe(
      FULL_LAUNCH_SCREEN_DURATION_MS
    );
    await expect(resolveLaunchScreenDurationForToday(afternoon)).resolves.toBe(
      COMPACT_LAUNCH_SCREEN_DURATION_MS
    );
  });
});
