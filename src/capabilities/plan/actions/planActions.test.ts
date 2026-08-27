import type { ActivityCalendarBinding } from '../../../domain/types';
import {
  PlanActionConfirmationError,
  PlanActionUnconfirmedError,
  removePlanCalendarSession,
  reschedulePlanCalendarSession,
  schedulePlanCalendarSession,
  type PlanCalendarActionBoundary,
} from './planActions';

const writeCalendarRef = {
  provider: 'google' as const,
  accountId: 'account-1',
  calendarId: 'calendar-1',
};

const binding: ActivityCalendarBinding = {
  kind: 'provider',
  ...writeCalendarRef,
  eventId: 'event-1',
  createdBy: 'plan',
};

function boundary(): jest.Mocked<PlanCalendarActionBoundary> {
  return {
    resolveBeforeCreate: jest.fn(async (
      _args: Parameters<PlanCalendarActionBoundary['resolveBeforeCreate']>[0],
    ) => null),
    createEvent: jest.fn(async (
      _args: Parameters<PlanCalendarActionBoundary['createEvent']>[0],
    ) => ({ eventRef: { ...writeCalendarRef, eventId: 'event-1' } })),
    resolveAfterCreate: jest.fn(async (
      _args: Parameters<PlanCalendarActionBoundary['resolveAfterCreate']>[0],
    ) => ({
      status: 'linked' as const,
      eventRef: { ...writeCalendarRef, eventId: 'event-1' },
    })),
    moveEvent: jest.fn(async (
      _args: Parameters<PlanCalendarActionBoundary['moveEvent']>[0],
    ) => undefined),
    deleteEvent: jest.fn(async (
      _binding: Parameters<PlanCalendarActionBoundary['deleteEvent']>[0],
    ) => undefined),
  };
}

describe('Plan calendar actions', () => {
  it('requires explicit confirmation before calendar writes', async () => {
    const calendar = boundary();
    await expect(schedulePlanCalendarSession({
      operationId: 'plan.schedule_activity', title: 'School call',
      startDate: '2026-08-27T15:00:00.000Z', endDate: '2026-08-27T15:30:00.000Z',
      writeCalendarRef, confirmed: false,
    }, calendar)).rejects.toBeInstanceOf(PlanActionConfirmationError);
    expect(calendar.createEvent).not.toHaveBeenCalled();
  });

  it('reuses an already-linked provider event and returns a canonical receipt', async () => {
    const calendar = boundary();
    calendar.resolveBeforeCreate.mockResolvedValue({
      status: 'linked', eventRef: { ...writeCalendarRef, eventId: 'existing-event' },
    });
    await expect(schedulePlanCalendarSession({
      operationId: 'plan.schedule_activity', title: 'School call',
      startDate: '2026-08-27T15:00:00.000Z', endDate: '2026-08-27T15:30:00.000Z',
      writeCalendarRef, confirmed: true,
    }, calendar)).resolves.toMatchObject({
      operationId: 'plan.schedule_activity', status: 'completed', reversible: true,
      resultRefs: [{ kind: 'calendar_event', id: 'google:account-1:calendar-1:existing-event' }],
      result: { eventRef: { eventId: 'existing-event' }, recovered: true },
    });
    expect(calendar.createEvent).not.toHaveBeenCalled();
  });

  it('recovers the authoritative event reference after an ambiguous create response', async () => {
    const calendar = boundary();
    calendar.createEvent.mockRejectedValue(new Error('timeout'));
    await expect(schedulePlanCalendarSession({
      operationId: 'plan.schedule_chunks', title: 'Proposal block',
      startDate: '2026-08-27T15:00:00.000Z', endDate: '2026-08-27T16:00:00.000Z',
      writeCalendarRef, confirmed: true,
    }, calendar)).resolves.toMatchObject({
      operationId: 'plan.schedule_chunks', result: { eventRef: { eventId: 'event-1' }, recovered: true },
    });
    expect(calendar.resolveAfterCreate).toHaveBeenCalledWith(expect.objectContaining({ createResult: null }));
  });

  it('refuses to claim success when a calendar create cannot be linked', async () => {
    const calendar = boundary();
    calendar.resolveAfterCreate.mockResolvedValue({ status: 'unconfirmed' });
    await expect(schedulePlanCalendarSession({
      operationId: 'plan.schedule_activity', title: 'School call',
      startDate: '2026-08-27T15:00:00.000Z', endDate: '2026-08-27T15:30:00.000Z',
      writeCalendarRef, confirmed: true,
    }, calendar)).rejects.toBeInstanceOf(PlanActionUnconfirmedError);
  });

  it('moves and removes the exact managed event with reversible receipts', async () => {
    const calendar = boundary();
    await expect(reschedulePlanCalendarSession({
      binding, startDate: '2026-08-27T16:00:00.000Z', endDate: '2026-08-27T16:30:00.000Z',
      confirmed: true,
    }, calendar)).resolves.toMatchObject({
      operationId: 'plan.reschedule_activity', reversible: true,
      resultRefs: [{ kind: 'calendar_event', id: 'google:account-1:calendar-1:event-1' }],
    });
    expect(calendar.moveEvent).toHaveBeenCalledWith({
      binding,
      start: new Date('2026-08-27T16:00:00.000Z'),
      end: new Date('2026-08-27T16:30:00.000Z'),
    });

    await expect(removePlanCalendarSession({ binding, confirmed: true }, calendar)).resolves.toMatchObject({
      operationId: 'plan.remove_activity', reversible: true,
    });
    expect(calendar.deleteEvent).toHaveBeenCalledWith(binding);
  });
});
