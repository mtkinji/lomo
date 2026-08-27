import { act, renderHook } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import { useActivityScheduleSheetController } from './useActivityScheduleSheetController';

const activity = {
  id: 'activity-1',
  title: 'Plan the launch',
  estimateMinutes: 45,
  scheduledAt: '2026-07-11T16:30:00.000Z',
  calendarBinding: null,
} as Activity;

describe('useActivityScheduleSheetController', () => {
  it('hydrates and opens the schedule sheet from the activity contract', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-10T16:00:00.000Z'));
    const onOpen = jest.fn();
    const { result } = renderHook(() =>
      useActivityScheduleSheetController({
        visible: false,
        activity,
        activities: [activity],
        goals: [],
        activityAreas: [],
        userProfile: null,
        updateActivity: jest.fn(),
        showToast: jest.fn(),
        onOpen,
        onClose: jest.fn(),
        onScheduled: jest.fn(),
      }),
    );

    act(() => result.current.open());

    expect(result.current.targetDate).toEqual(new Date('2026-07-11T16:30:00.000Z'));
    expect(result.current.durationMinutes).toBe(45);
    expect(result.current.selectedSlotIndex).toBe(0);
    expect(result.current.selectedSlot).toBeNull();
    expect(result.current.selectedSlotDraft).toBeNull();
    expect(onOpen).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('keeps a user-positioned draft as the selected slot', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-10T16:00:00.000Z'));
    const { result } = renderHook(() =>
      useActivityScheduleSheetController({
        visible: false,
        activity,
        activities: [activity],
        goals: [],
        activityAreas: [],
        userProfile: null,
        updateActivity: jest.fn(),
        showToast: jest.fn(),
        onOpen: jest.fn(),
        onClose: jest.fn(),
        onScheduled: jest.fn(),
      }),
    );
    const start = new Date('2026-07-12T18:00:00.000Z');
    const end = new Date('2026-07-12T18:45:00.000Z');

    act(() => result.current.selectSlotDraft({ start, end }));

    expect(result.current.selectedSlot).toEqual({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    expect(result.current.selectedSlotDraft).toEqual({ start, end });
    expect(result.current.selectedSlotIndex).toBe(-1);
    jest.useRealTimers();
  });
});
