import { act, renderHook } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { useActivityRepeatEditor } from './useActivityRepeatEditor';

describe('useActivityRepeatEditor', () => {
  it('hydrates and commits a normalized custom weekly rule', () => {
    const activity = {
      id: 'activity-1',
      repeatRule: 'custom',
      repeatCustom: { cadence: 'weeks', interval: 2, weekdays: [3, 1, 3] },
    } as Activity;
    const updateActivity = jest.fn();
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useActivityRepeatEditor({
        activity,
        updateActivity,
        onClose,
        onOpenCustom: jest.fn(),
        onReturnToPresets: jest.fn(),
      }),
    );

    act(() => result.current.hydrateCustom());
    expect(result.current.interval).toBe(2);
    expect(result.current.weekdays).toEqual([1, 3]);

    act(() => result.current.commitCustom());
    const updater = updateActivity.mock.calls[0][1];
    expect(updater(activity)).toEqual(expect.objectContaining({
      repeatRule: 'custom',
      repeatCustom: { cadence: 'weeks', interval: 2, weekdays: [1, 3] },
    }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
