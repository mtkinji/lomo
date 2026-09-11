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


it('edits, saves and rehydrates a monthly weekday pattern', () => {
  const activity = { id: 'monthly', repeatRule: 'monthly' } as Activity;
  const updateActivity = jest.fn();
  const { result, rerender } = renderHook(({ current }: { current: Activity }) => useActivityRepeatEditor({
    activity: current, updateActivity, onClose: jest.fn(), onOpenCustom: jest.fn(), onReturnToPresets: jest.fn(),
  }), { initialProps: { current: activity } });
  act(() => { result.current.setCadence('months'); result.current.setMonthlyWeekday({ ordinal: 3, weekday: 0 }); });
  act(() => result.current.commitCustom());
  const saved = updateActivity.mock.calls[0][1](activity);
  expect(saved.repeatCustom).toEqual({ cadence: 'months', interval: 1, monthlyWeekday: { ordinal: 3, weekday: 0 } });
  rerender({ current: saved });
  act(() => result.current.hydrateCustom());
  expect(result.current.monthlyWeekday).toEqual({ ordinal: 3, weekday: 0 });
  act(() => result.current.setMonthlyWeekday(undefined));
  act(() => result.current.commitCustom());
  expect(updateActivity.mock.calls[1][1](saved).repeatCustom).toEqual({ cadence: 'months', interval: 1 });
});
