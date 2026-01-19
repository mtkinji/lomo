import * as Calendar from 'expo-calendar';

export interface DeviceCalendar {
  id: string;
  title: string;
  color: string;
  isPrimary?: boolean;
  allowsModifications?: boolean;
}

export interface DeviceCalendarEvent {
  id: string;
  title?: string;
  startDate: Date;
  endDate: Date;
  calendarId: string;
  allDay?: boolean;
}

export async function requestCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function getCalendarPermissions(): Promise<boolean> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  return status === 'granted';
}

export async function getWritableCalendars(): Promise<DeviceCalendar[]> {
  const hasPermission = await getCalendarPermissions();
  if (!hasPermission) return [];

  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return all
    .filter((cal) => {
      // iOS exposes `allowsModifications`; Android uses accessLevel/source.
      // We treat missing fields as permissive and let createEventAsync fail gracefully if needed.
      const anyCal = cal as unknown as { allowsModifications?: boolean };
      return anyCal.allowsModifications !== false;
    })
    .map((cal) => ({
      id: cal.id,
      title: cal.title,
      color: cal.color,
      isPrimary: (cal as any).isPrimary,
      allowsModifications: (cal as any).allowsModifications,
    }));
}

export async function getAllCalendars(): Promise<DeviceCalendar[]> {
  const hasPermission = await getCalendarPermissions();
  if (!hasPermission) return [];
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return (all ?? []).map((cal) => ({
    id: cal.id,
    title: cal.title,
    color: cal.color,
    isPrimary: (cal as any).isPrimary,
    allowsModifications: (cal as any).allowsModifications,
  }));
}

export async function getDefaultCalendarId(): Promise<string | null> {
  try {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    return defaultCal?.id ?? null;
  } catch {
    return null;
  }
}

export async function getCalendarEvents(params: {
  calendarIds: string[];
  startDate: Date;
  endDate: Date;
}): Promise<DeviceCalendarEvent[]> {
  const hasPermission = await getCalendarPermissions();
  if (!hasPermission) return [];

  const calendarIds = Array.isArray(params.calendarIds) ? params.calendarIds.filter(Boolean) : [];
  if (calendarIds.length === 0) return [];

  try {
    const events = await Calendar.getEventsAsync(calendarIds, params.startDate, params.endDate);
    return (events ?? [])
      .map((e) => ({
        id: e.id,
        title: e.title ?? undefined,
        startDate: e.startDate,
        endDate: e.endDate,
        calendarId: (e as any).calendarId ?? '',
        allDay: Boolean((e as any).allDay),
      }))
      .filter((e) => Boolean(e.id) && Boolean(e.startDate) && Boolean(e.endDate) && Boolean(e.calendarId));
  } catch {
    return [];
  }
}

export interface CreateEventParams {
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  calendarId: string;
}

export async function createCalendarEvent(params: CreateEventParams): Promise<string> {
  return await Calendar.createEventAsync(params.calendarId, {
    title: params.title,
    startDate: params.startDate,
    endDate: params.endDate,
    notes: params.notes,
    location: params.location,
    timeZone: 'UTC', // expo-calendar usually handles local time internally if TZ is provided, but 'UTC' is often safest for ISO dates.
  });
}

export async function deleteCalendarEvent(calendarId: string, eventId: string): Promise<void> {
  await Calendar.deleteEventAsync(eventId);
}

export async function updateCalendarEvent(eventId: string, params: Partial<CreateEventParams>): Promise<string> {
  const details: any = {};
  if (params.title) details.title = params.title;
  if (params.startDate) details.startDate = params.startDate;
  if (params.endDate) details.endDate = params.endDate;
  if (params.notes) details.notes = params.notes;
  if (params.location) details.location = params.location;
  if (params.calendarId) details.calendarId = params.calendarId as any;
  return await Calendar.updateEventAsync(eventId, details);
}

