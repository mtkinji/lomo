import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import type { Activity } from '../../domain/types';
import type { PlanSlotDraft } from './planSlotDraft';
import { usePlanSlotCapture, usePlanSlotSelectionState } from './usePlanSlotCapture';

jest.mock('../../store/proToolsAccess', () => ({
  useCanUseProTools: jest.fn(() => false),
}));

jest.mock('../activities/useQuickAddDockController', () => ({
  useQuickAddDockController: jest.fn(() => ({
    value: '',
    setValue: jest.fn(),
    inputRef: { current: null },
    isFocused: false,
    setIsFocused: jest.fn(),
    submit: jest.fn(),
    collapse: jest.fn(),
  })),
}));

describe('usePlanSlotSelectionState', () => {
  it('clears the selected and created to-do when capture closes', () => {
    let currentSlot: PlanSlotDraft | null = {
      start: new Date('2026-07-13T10:00:00.000-06:00'),
      end: new Date('2026-07-13T11:00:00.000-06:00'),
    };
    const { result, rerender } = renderHook(() => usePlanSlotSelectionState(currentSlot));

    act(() => {
      result.current.setSelectedActivityId('activity-existing');
      result.current.setCreatedActivityId('activity-created');
    });

    expect(result.current.selectedActivityId).toBe('activity-existing');
    expect(result.current.createdActivityId).toBe('activity-created');

    currentSlot = null;
    rerender(undefined);

    expect(result.current.selectedActivityId).toBeNull();
    expect(result.current.createdActivityId).toBeNull();
  });
});

describe('usePlanSlotCapture', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('lets the user add an appointment after warning about a calendar conflict', async () => {
    const slotDraft: PlanSlotDraft = {
      start: new Date('2026-07-20T09:00:00.000-06:00'),
      end: new Date('2026-07-20T09:30:00.000-06:00'),
    };
    const activity: Activity = {
      id: 'activity-1',
      goalId: null,
      title: 'Conflicting appointment',
      type: 'task',
      tags: [],
      status: 'planned',
      forceActual: {},
      createdAt: '2026-07-20T14:00:00.000Z',
      updatedAt: '2026-07-20T14:00:00.000Z',
    };
    const commitProposal = jest.fn(async () => true);
    const clearSlotDraft = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const { result } = renderHook(() =>
      usePlanSlotCapture({
        slotDraft,
        activities: [activity],
        goals: [],
        arcs: [],
        dateKey: '2026-07-20',
        busyIntervals: [
          {
            start: new Date('2026-07-20T09:00:00.000-06:00'),
            end: new Date('2026-07-20T10:00:00.000-06:00'),
          },
        ],
        scheduleProposals: [],
        writeCalendarId: 'calendar-1',
        getPlanModeForActivity: () => 'personal',
        isWithinWindows: () => true,
        quickAddAiActions: [],
        setQuickAddAiActions: jest.fn(),
        addActivity: jest.fn(),
        updateActivity: jest.fn(),
        recordShowUp: jest.fn(),
        showToast: jest.fn(),
        commitProposal,
        clearSlotDraft,
      }),
    );

    act(() => result.current?.onSelectActivity(activity.id));
    await act(async () => result.current?.onCommitExisting());

    expect(commitProposal).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Time conflict',
      'That time conflicts with your calendar. Add it anyway?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Add anyway', onPress: expect.any(Function) }),
      ]),
    );

    const addAnyway = alertSpy.mock.calls[0]?.[2]?.find((button) => button.text === 'Add anyway');
    await act(async () => {
      addAnyway?.onPress?.();
      await Promise.resolve();
    });

    expect(commitProposal).toHaveBeenCalledWith(
      activity.id,
      expect.objectContaining({
        activityId: activity.id,
        startDate: slotDraft.start.toISOString(),
        endDate: slotDraft.end.toISOString(),
      }),
    );
    expect(clearSlotDraft).toHaveBeenCalledTimes(1);
  });

  it('lets the user add a manually selected time after warning that it is outside availability', async () => {
    const slotDraft: PlanSlotDraft = {
      start: new Date('2026-08-26T11:45:00.000-06:00'),
      end: new Date('2026-08-26T12:45:00.000-06:00'),
    };
    const activity: Activity = {
      id: 'activity-1',
      goalId: null,
      title: 'Pick up my drivers license from Chase Bank tomorrow',
      type: 'task',
      tags: [],
      status: 'planned',
      forceActual: {},
      createdAt: '2026-08-26T14:00:00.000Z',
      updatedAt: '2026-08-26T14:00:00.000Z',
    };
    const commitProposal = jest.fn(async () => true);
    const clearSlotDraft = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const { result } = renderHook(() =>
      usePlanSlotCapture({
        slotDraft,
        activities: [activity],
        goals: [],
        arcs: [],
        dateKey: '2026-08-26',
        busyIntervals: [],
        scheduleProposals: [],
        writeCalendarId: 'calendar-1',
        getPlanModeForActivity: () => 'personal',
        isWithinWindows: () => false,
        quickAddAiActions: [],
        setQuickAddAiActions: jest.fn(),
        addActivity: jest.fn(),
        updateActivity: jest.fn(),
        recordShowUp: jest.fn(),
        showToast: jest.fn(),
        commitProposal,
        clearSlotDraft,
      }),
    );

    act(() => result.current?.onSelectActivity(activity.id));
    await act(async () => result.current?.onCommitExisting());

    expect(commitProposal).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Outside availability',
      'This time is outside your availability. Add it anyway?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Add anyway', onPress: expect.any(Function) }),
      ]),
    );

    const addAnyway = alertSpy.mock.calls[0]?.[2]?.find((button) => button.text === 'Add anyway');
    await act(async () => {
      addAnyway?.onPress?.();
      await Promise.resolve();
    });

    expect(commitProposal).toHaveBeenCalledWith(
      activity.id,
      expect.objectContaining({
        activityId: activity.id,
        startDate: slotDraft.start.toISOString(),
        endDate: slotDraft.end.toISOString(),
      }),
    );
    expect(clearSlotDraft).toHaveBeenCalledTimes(1);
  });

  it('blocks an exact duplicate session before offering the generic conflict override', async () => {
    const slotDraft: PlanSlotDraft = {
      start: new Date('2026-07-20T09:00:00.000-06:00'),
      end: new Date('2026-07-20T09:30:00.000-06:00'),
    };
    const activity: Activity = {
      id: 'activity-1', goalId: null, title: 'Draft family story center', type: 'task', tags: [],
      status: 'planned', forceActual: {}, createdAt: '2026-07-20T14:00:00.000Z', updatedAt: '2026-07-20T14:00:00.000Z',
      scheduleSessions: [{
        id: 'session-1', activityId: 'activity-1', start: slotDraft.start.toISOString(), end: slotDraft.end.toISOString(),
        calendarBinding: { kind: 'provider', provider: 'google', accountId: 'account-1', calendarId: 'calendar-1', eventId: 'event-1', createdBy: 'plan' },
        source: 'plan', status: 'scheduled', createdAt: '2026-07-20T14:00:00.000Z', updatedAt: '2026-07-20T14:00:00.000Z',
      }],
    };
    const commitProposal = jest.fn(async () => true);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const { result } = renderHook(() => usePlanSlotCapture({
      slotDraft, activities: [activity], goals: [], arcs: [], dateKey: '2026-07-20', busyIntervals: [],
      scheduleProposals: [], writeCalendarId: 'calendar-1', getPlanModeForActivity: () => 'personal',
      isWithinWindows: () => true, quickAddAiActions: [], setQuickAddAiActions: jest.fn(), addActivity: jest.fn(),
      updateActivity: jest.fn(), recordShowUp: jest.fn(), showToast: jest.fn(), commitProposal, clearSlotDraft: jest.fn(),
    }));

    act(() => result.current?.onSelectActivity(activity.id));
    await act(async () => result.current?.onCommitExisting());

    expect(alertSpy).toHaveBeenCalledWith('Already scheduled there', 'Choose a different time to add another session.');
    expect(commitProposal).not.toHaveBeenCalled();
  });
});
