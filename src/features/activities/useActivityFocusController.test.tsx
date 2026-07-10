import { act, renderHook } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { useActivityFocusController } from './useActivityFocusController';

jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
}));

jest.mock('../../services/screenTimeProtectionRuntime', () => ({
  reconcileScreenTimeRestrictions: jest.fn(async () => []),
}));

jest.mock('../../services/soundscape', () => ({
  preloadSoundscape: jest.fn(async () => undefined),
}));

describe('useActivityFocusController', () => {
  it('opens with the bounded last-used duration', () => {
    const onOpen = jest.fn();
    const { result } = renderHook(() =>
      useActivityFocusController({
        activity: { id: 'activity-1', title: 'Write launch plan', estimateMinutes: 45 } as Activity,
        activityId: 'activity-1',
        maxMinutes: 10,
        lastFocusMinutes: 25,
        soundscapeTrackId: 'default',
        setLastFocusMinutes: jest.fn(),
        onOpen,
        onClose: jest.fn(),
      }),
    );

    act(() => result.current.open());

    expect(result.current.minutes).toBe(10);
    expect(result.current.customExpanded).toBe(false);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
