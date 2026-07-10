import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { Activity, ActivityArea, Goal, UserProfile } from '../../domain/types';
import type { ToastPayload } from '../../store/useToastStore';
import type { useAppStore } from '../../store/useAppStore';
import { inferCalendarBindingHealth } from '../../services/calendar/calendarBinding';
import {
  createCalendarEvent,
  getOrInitCalendarPreferences,
  listBusyIntervals,
  listCalendarEvents,
  type CalendarEvent,
  type CalendarEventRef,
  type CalendarRef,
} from '../../services/plan/calendarApi';
import {
  getCalendarCommitAlertForError,
  resolveCalendarEventRefAfterCreate,
  resolveCalendarEventRefBeforeCreate,
} from '../../services/plan/calendarEventCommit';
import { getKwiltCalendarBlocksForDay } from '../../services/plan/kwiltCalendarBlocks';
import { proposeSlotsForActivity } from '../../services/plan/planScheduling';
import { resolveManualScheduleSlot } from './activityScheduleSlots';
import {
  formatScheduleSlotTimeRange,
  getScheduleDurationOptions,
  resolveScheduleDurationMinutes,
} from './activityScheduleDisplay';
import { resolveActivityScheduleSheetDraft } from './activityScheduleSheetDraft';
import {
  resolveSelectedScheduleSlot,
  type ActivityScheduleSlot,
} from './activityScheduleSelection';

type UpdateActivity = ReturnType<typeof useAppStore.getState>['updateActivity'];

type ScheduleHorizonCache = {
  start: Date;
  end: Date;
  busyAll: Array<{ start: Date; end: Date }>;
  eventsAll: CalendarEvent[];
};

export type ActivityScheduleOpenOptions = {
  startAt?: Date | null;
  durationMinutes?: number | null;
};

export type ActivityScheduleSheetControllerProps = {
  visible: boolean;
  activity: Activity | undefined;
  activities: Activity[];
  goals: Goal[];
  activityAreas: ActivityArea[];
  userProfile: UserProfile | null;
  updateActivity: UpdateActivity;
  showToast: (input: ToastPayload) => void;
  onOpen: () => void;
  onClose: () => void;
  onScheduled: (message: string) => void;
};

export type ActivityScheduleSheetController = {
  loading: boolean;
  isCommitting: boolean;
  bindingHealth: ReturnType<typeof inferCalendarBindingHealth>;
  durationMinutes: number;
  durationOptions: number[];
  durationExpanded: boolean;
  targetDate: Date;
  targetDayLabel: string;
  externalEvents: CalendarEvent[];
  writeRef: CalendarRef | null;
  slots: ActivityScheduleSlot[];
  selectedSlot: ActivityScheduleSlot | null;
  selectedSlotIndex: number;
  selectedSlotLabel: string | null;
  horizonExhausted: boolean;
  kwiltBlocks: ReturnType<typeof getKwiltCalendarBlocksForDay>;
  calendarColorByRefKey: Record<string, string>;
  open: (options?: ActivityScheduleOpenOptions) => void;
  close: () => void;
  setDurationExpanded: (expanded: boolean | ((current: boolean) => boolean)) => void;
  setDurationMinutes: (minutes: number) => void;
  selectSuggestedSlot: (index: number) => void;
  selectTargetDate: (date: Date) => void;
  selectManualTime: (params: { date: Date }) => void;
  confirmSelectedSlot: (slotIndex?: number) => Promise<void>;
};

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function dayBounds(day: Date) {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function sliceBusyForDay(
  intervals: Array<{ start: Date; end: Date }>,
  day: Date,
) {
  const bounds = dayBounds(day);
  return intervals.filter((interval) => overlaps(interval.start, interval.end, bounds.start, bounds.end));
}

function sliceEventsForDay(events: CalendarEvent[], day: Date) {
  const bounds = dayBounds(day);
  return events.filter((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      overlaps(start, end, bounds.start, bounds.end);
  });
}

export function useActivityScheduleSheetController({
  visible,
  activity,
  activities,
  goals,
  activityAreas,
  userProfile,
  updateActivity,
  showToast,
  onOpen,
  onClose,
  onScheduled,
}: ActivityScheduleSheetControllerProps): ActivityScheduleSheetController {
  const initialDraft = resolveActivityScheduleSheetDraft({
    scheduledAt: activity?.scheduledAt,
    estimateMinutes: activity?.estimateMinutes,
  });
  const [durationDraft, setDurationDraft] = useState(initialDraft.durationDraft);
  const [durationExpanded, setDurationExpanded] = useState(false);
  const [targetDate, setTargetDate] = useState(initialDraft.targetDate);
  const initialTargetDateRef = useRef(initialDraft.targetDate);
  const horizonCacheRef = useRef<ScheduleHorizonCache | null>(null);
  const [fetchNonce, setFetchNonce] = useState(0);
  const [busyIntervals, setBusyIntervals] = useState<Array<{ start: Date; end: Date }>>([]);
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [writeRef, setWriteRef] = useState<CalendarRef | null>(null);
  const [loading, setLoading] = useState(false);
  const [horizonExhausted, setHorizonExhausted] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [manualScheduleSlot, setManualScheduleSlot] = useState<ActivityScheduleSlot | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  const durationMinutes = useMemo(
    () => resolveScheduleDurationMinutes({
      draft: durationDraft,
      fallbackEstimateMinutes: activity?.estimateMinutes,
    }),
    [activity?.estimateMinutes, durationDraft],
  );
  const durationOptions = useMemo(() => getScheduleDurationOptions(), []);
  const bindingHealth = useMemo(
    () => inferCalendarBindingHealth({
      binding: activity?.calendarBinding ?? null,
      deviceCalendarPermission: 'unknown',
      providerConnection: 'unknown',
    }),
    [activity?.calendarBinding],
  );
  const slots = useMemo<ActivityScheduleSlot[]>(() => {
    if (!activity) return [];
    return proposeSlotsForActivity({
      activity: { ...activity, estimateMinutes: durationMinutes },
      goals,
      userProfile,
      targetDate,
      busyIntervals,
      writeCalendarId: writeRef?.calendarId ?? null,
      activityAreas,
      limit: 6,
    });
  }, [activity, activityAreas, busyIntervals, durationMinutes, goals, targetDate, userProfile, writeRef?.calendarId]);
  const selectedSlot = resolveSelectedScheduleSlot({
    manualScheduleSlot,
    scheduleSlots: slots,
    selectedSlotIndex,
  });
  const selectedSlotLabel = selectedSlot
    ? formatScheduleSlotTimeRange(selectedSlot)
    : null;
  const targetDayLabel = useMemo(
    () => targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    [targetDate],
  );
  const kwiltBlocks = useMemo(
    () => getKwiltCalendarBlocksForDay(activities, targetDate),
    [activities, targetDate],
  );

  const open = useCallback((options: ActivityScheduleOpenOptions = {}) => {
    if (!activity) return;
    const draft = options.startAt && !Number.isNaN(options.startAt.getTime())
      ? {
          draftStart: options.startAt,
          targetDate: new Date(options.startAt),
          durationDraft: String(Math.max(5, Math.round(options.durationMinutes ?? activity.estimateMinutes ?? 30))),
        }
      : resolveActivityScheduleSheetDraft({
          scheduledAt: activity.scheduledAt,
          estimateMinutes: options.durationMinutes ?? activity.estimateMinutes,
        });
    setDurationDraft(draft.durationDraft);
    setDurationExpanded(false);
    initialTargetDateRef.current = new Date(draft.targetDate);
    horizonCacheRef.current = null;
    setTargetDate(new Date(draft.targetDate));
    setSelectedSlotIndex(0);
    setManualScheduleSlot(null);
    setHorizonExhausted(false);
    setFetchNonce((current) => current + 1);
    onOpen();
  }, [activity, onOpen]);

  useEffect(() => {
    if (!visible || !activity) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setHorizonExhausted(false);
        setManualScheduleSlot(null);
        const preferences = await getOrInitCalendarPreferences();
        if (cancelled) return;
        const nextWriteRef = preferences.writeCalendarRef ?? null;
        const readRefs = preferences.readCalendarRefs ?? [];
        setWriteRef(nextWriteRef);
        if (!nextWriteRef) {
          setBusyIntervals([]);
          setExternalEvents([]);
          return;
        }

        const horizonStart = new Date(initialTargetDateRef.current);
        horizonStart.setHours(0, 0, 0, 0);
        const horizonEnd = new Date(horizonStart);
        horizonEnd.setDate(horizonEnd.getDate() + 15);
        const [busyResult, eventsResult] = await Promise.all([
          listBusyIntervals({
            start: horizonStart.toISOString(),
            end: horizonEnd.toISOString(),
            readCalendarRefs: [...readRefs, nextWriteRef],
          }),
          listCalendarEvents({
            start: horizonStart.toISOString(),
            end: horizonEnd.toISOString(),
            readCalendarRefs: [...readRefs, nextWriteRef],
          }),
        ]);
        if (cancelled) return;
        const allBusy = (busyResult.intervals ?? [])
          .map((interval) => ({ start: new Date(interval.start), end: new Date(interval.end) }))
          .filter((interval) => !Number.isNaN(interval.start.getTime()) && !Number.isNaN(interval.end.getTime()));
        const allEvents = eventsResult.events ?? [];
        horizonCacheRef.current = { start: horizonStart, end: horizonEnd, busyAll: allBusy, eventsAll: allEvents };

        let resolvedDate: Date | null = null;
        for (let offset = 0; offset <= 14; offset += 1) {
          const day = new Date(horizonStart);
          day.setDate(day.getDate() + offset);
          const dayBusy = sliceBusyForDay(allBusy, day);
          const proposed = proposeSlotsForActivity({
            activity: { ...activity, estimateMinutes: durationMinutes },
            goals,
            userProfile,
            targetDate: day,
            busyIntervals: dayBusy,
            writeCalendarId: nextWriteRef.calendarId,
            activityAreas,
            limit: 6,
          });
          if (proposed.length === 0) continue;
          resolvedDate = day;
          setTargetDate(day);
          setBusyIntervals(dayBusy);
          setExternalEvents(sliceEventsForDay(allEvents, day));
          setSelectedSlotIndex(0);
          break;
        }

        if (!resolvedDate) {
          setTargetDate(horizonStart);
          setBusyIntervals(sliceBusyForDay(allBusy, horizonStart));
          setExternalEvents(sliceEventsForDay(allEvents, horizonStart));
          setSelectedSlotIndex(0);
          setHorizonExhausted(true);
        }
      } catch {
        if (cancelled) return;
        setBusyIntervals([]);
        setExternalEvents([]);
        setWriteRef(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activity, activityAreas, durationMinutes, fetchNonce, goals, userProfile, visible]);

  useEffect(() => {
    if (!visible) return;
    setManualScheduleSlot(null);
    setSelectedSlotIndex(0);
  }, [durationMinutes, visible]);

  const selectTargetDate = useCallback((date: Date) => {
    const nextDate = new Date(date);
    if (Number.isNaN(nextDate.getTime())) return;
    nextDate.setHours(12, 0, 0, 0);
    setManualScheduleSlot(null);
    setSelectedSlotIndex(0);
    setHorizonExhausted(false);
    const cache = horizonCacheRef.current;
    if (cache && nextDate >= cache.start && nextDate < cache.end) {
      setTargetDate(nextDate);
      setBusyIntervals(sliceBusyForDay(cache.busyAll, nextDate));
      setExternalEvents(sliceEventsForDay(cache.eventsAll, nextDate));
      return;
    }
    initialTargetDateRef.current = nextDate;
    horizonCacheRef.current = null;
    setTargetDate(nextDate);
    setFetchNonce((current) => current + 1);
  }, []);

  const selectManualTime = useCallback(({ date }: { date: Date }) => {
    if (!activity) return;
    if (!writeRef?.calendarId) {
      showToast({ message: 'Set a Plan write calendar to schedule.', variant: 'default', durationMs: 2200 });
      return;
    }
    const start = new Date(date);
    if (Number.isNaN(start.getTime())) return;
    start.setSeconds(0, 0);
    const resolved = resolveManualScheduleSlot({
      activity,
      activityAreas,
      goals,
      userProfile,
      date: start,
      durationMinutes,
      busyIntervals,
    });
    if (!resolved.ok) {
      if (resolved.toast) showToast({ ...resolved.toast, variant: 'default' });
      return;
    }
    setManualScheduleSlot(resolved.slot);
    setSelectedSlotIndex(-1);
  }, [activity, activityAreas, busyIntervals, durationMinutes, goals, showToast, userProfile, writeRef?.calendarId]);

  const confirmSelectedSlot = useCallback(async (slotIndex?: number) => {
    if (!activity) return;
    if (!writeRef) {
      Alert.alert('Choose a write calendar', 'Set a write calendar in Settings → Plan Calendars to schedule.');
      return;
    }
    const slot = typeof slotIndex === 'number'
      ? slots[slotIndex] ?? null
      : resolveSelectedScheduleSlot({ manualScheduleSlot, scheduleSlots: slots, selectedSlotIndex });
    if (!slot) {
      Alert.alert('No available slots', 'Kwilt couldn’t find a free slot for this day.');
      return;
    }
    const applyBinding = (eventRef: CalendarEventRef) => {
      const updatedAt = new Date().toISOString();
      updateActivity(activity.id, (previous) => ({
        ...previous,
        scheduledAt: slot.startDate,
        calendarBinding: {
          kind: 'provider',
          provider: eventRef.provider,
          accountId: eventRef.accountId,
          calendarId: eventRef.calendarId,
          eventId: eventRef.eventId,
          createdBy: 'activity_detail',
        },
        scheduledProvider: eventRef.provider,
        scheduledProviderAccountId: eventRef.accountId,
        scheduledProviderCalendarId: eventRef.calendarId,
        scheduledProviderEventId: eventRef.eventId,
        updatedAt,
      }));
      onClose();
      onScheduled('Scheduled on your calendar.');
    };

    setIsCommitting(true);
    try {
      const existing = await resolveCalendarEventRefBeforeCreate({ block: slot, writeRef });
      if (existing?.status === 'linked') {
        applyBinding(existing.eventRef);
        return;
      }
      const created = await createCalendarEvent({
        title: activity.title,
        start: slot.startDate,
        end: slot.endDate,
        writeCalendarRef: writeRef,
      });
      const resolved = await resolveCalendarEventRefAfterCreate({ createResult: created, block: slot, writeRef });
      if (resolved.status === 'linked') {
        applyBinding(resolved.eventRef);
      } else if (resolved.status === 'unconfirmed') {
        Alert.alert('Check your calendar', 'We may have added this block, but we couldn’t confirm it. Please check your calendar.');
      } else {
        Alert.alert('Check your calendar', 'We couldn’t safely link this event for future moves/unschedule. Please check your calendar.');
      }
    } catch (error) {
      const recovered = await resolveCalendarEventRefAfterCreate({ createResult: null, block: slot, writeRef });
      if (recovered.status === 'linked') {
        applyBinding(recovered.eventRef);
      } else if (recovered.status === 'unlinked') {
        Alert.alert('Check your calendar', 'We may have added this block, but we couldn’t safely link it for future moves/unschedule. Please check your calendar before trying again.');
      } else {
        const alert = getCalendarCommitAlertForError(error);
        if (alert) Alert.alert(alert.title, alert.message);
      }
    } finally {
      setIsCommitting(false);
    }
  }, [activity, manualScheduleSlot, onClose, onScheduled, selectedSlotIndex, slots, updateActivity, writeRef]);

  return {
    loading,
    isCommitting,
    bindingHealth,
    durationMinutes,
    durationOptions,
    durationExpanded,
    targetDate,
    targetDayLabel,
    externalEvents,
    writeRef,
    slots,
    selectedSlot,
    selectedSlotIndex,
    selectedSlotLabel,
    horizonExhausted,
    kwiltBlocks,
    calendarColorByRefKey: {},
    open,
    close: onClose,
    setDurationExpanded,
    setDurationMinutes: (minutes) => setDurationDraft(String(minutes)),
    selectSuggestedSlot: (index) => {
      setManualScheduleSlot(null);
      setSelectedSlotIndex(index);
    },
    selectTargetDate,
    selectManualTime,
    confirmSelectedSlot,
  };
}
