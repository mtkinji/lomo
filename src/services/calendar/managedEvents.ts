import type { ActivityCalendarBinding } from '../../domain/types';
import { deleteCalendarEvent as deleteDeviceCalendarEvent, updateCalendarEvent as updateDeviceCalendarEvent } from './deviceCalendar';
import { deleteCalendarEvent as deleteProviderCalendarEvent, updateCalendarEvent as updateProviderCalendarEvent } from '../plan/calendarApi';

export async function deleteManagedEvent(binding: ActivityCalendarBinding): Promise<void> {
  if (binding.kind === 'device') {
    await deleteDeviceCalendarEvent(binding.calendarId, binding.eventId);
    return;
  }
  await deleteProviderCalendarEvent({
    eventRef: {
      provider: binding.provider,
      accountId: binding.accountId,
      calendarId: binding.calendarId,
      eventId: binding.eventId,
    },
  });
}

export async function moveManagedEvent(params: {
  binding: ActivityCalendarBinding;
  start: Date;
  end: Date;
}): Promise<void> {
  const { binding, start, end } = params;
  if (binding.kind === 'device') {
    await updateDeviceCalendarEvent(binding.eventId, { startDate: start, endDate: end });
    return;
  }
  await updateProviderCalendarEvent({
    eventRef: {
      provider: binding.provider,
      accountId: binding.accountId,
      calendarId: binding.calendarId,
      eventId: binding.eventId,
    },
    start: start.toISOString(),
    end: end.toISOString(),
  });
}


