import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { KwiltCalendarBlock } from '../../services/plan/kwiltCalendarBlocks';
import { moveManagedEvent } from '../../services/calendar/managedEvents';
import { useToastStore } from '../../store/useToastStore';
import { usePlanSessionEditor } from './usePlanSessionEditor';

jest.mock('../../services/backend/auth', () => ({
  ensureSignedInWithPrompt: jest.fn(async () => undefined),
}));

jest.mock('../../services/calendar/managedEvents', () => ({
  moveManagedEvent: jest.fn(async () => undefined),
}));

const start = new Date('2026-08-11T13:00:00.000-06:00');
const end = new Date('2026-08-11T17:00:00.000-06:00');
const block: KwiltCalendarBlock = {
  activity: {
    id: 'activity-1',
    goalId: null,
    title: 'Work on Adobe presentation',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-08-11T12:00:00.000Z',
    updatedAt: '2026-08-11T12:00:00.000Z',
  },
  sessionId: 'session-1',
  binding: null,
  start,
  end,
};

function renderEditor(blocks: KwiltCalendarBlock[] = [block]) {
  return renderHook(() => usePlanSessionEditor({
    blocks,
    busyIntervals: [],
    getPlanMode: () => 'work',
    isWithinWindows: () => true,
    onBegin: jest.fn(),
    onCalendarAccessStatusChange: jest.fn(),
  }));
}

describe('usePlanSessionEditor', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    useToastStore.getState().clearToast();
  });

  it('opens the exact session, updates its live draft, and cancels without saving', () => {
    const { result } = renderEditor();

    act(() => result.current.begin({ activityId: 'activity-1', sessionId: 'session-1', start, end }));
    expect(result.current.model).toMatchObject({ title: block.activity.title, start, end });

    const laterEnd = new Date('2026-08-11T17:30:00.000-06:00');
    act(() => result.current.changeDraft({ start, end: laterEnd }));
    expect(result.current.model?.end).toEqual(laterEnd);

    act(() => result.current.cancel());
    expect(result.current.edit).toBeNull();
  });

  it('restores the original time when a direct save fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const { result } = renderEditor();
    const laterEnd = new Date('2026-08-11T17:30:00.000-06:00');

    act(() => result.current.begin({ activityId: 'activity-1', sessionId: 'session-1', start, end }));
    await act(async () => result.current.commitDraft({ start, end: laterEnd }));

    expect(alertSpy).toHaveBeenCalledWith(
      'Unable to move',
      'This block is not linked to a calendar event Kwilt can manage.',
    );
    expect(result.current.edit?.draft.end).toEqual(end);
    expect(result.current.model?.isSaving).toBe(false);
  });

  it('commits a released adjustment, keeps the peek selected, and offers undo', async () => {
    const boundBlock: KwiltCalendarBlock = {
      ...block,
      binding: {
        kind: 'provider',
        provider: 'google',
        accountId: 'account-1',
        calendarId: 'calendar-1',
        eventId: 'event-1',
        createdBy: 'plan',
      },
    };
    const { result } = renderEditor([boundBlock]);
    const laterEnd = new Date('2026-08-11T17:30:00.000-06:00');

    act(() => result.current.begin({ activityId: 'activity-1', sessionId: 'session-1', start, end }));
    await act(async () => result.current.commitDraft({ start, end: laterEnd }));

    expect(moveManagedEvent).toHaveBeenCalledWith({
      binding: boundBlock.binding,
      start,
      end: laterEnd,
    });
    expect(result.current.edit?.original.end).toEqual(laterEnd);
    expect(result.current.edit?.draft.end).toEqual(laterEnd);
    expect(result.current.model).not.toBeNull();
    expect(useToastStore.getState()).toMatchObject({
      message: 'Plan updated.',
      actionLabel: 'Undo',
    });

    await act(async () => useToastStore.getState().actionOnPress?.());

    expect(moveManagedEvent).toHaveBeenLastCalledWith({
      binding: boundBlock.binding,
      start,
      end,
    });
    expect(result.current.edit?.original.end).toEqual(end);
  });
});
