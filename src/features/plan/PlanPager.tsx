import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import { HStack, VStack, Text } from '../../ui/primitives';
import { useAppStore } from '../../store/useAppStore';
import { PlanCalendarLensPage } from './PlanCalendarLensPage';
import { PlanEventPeekDrawerHost, type PlanDrawerMode } from './PlanEventPeekDrawerHost';
import type { BusyInterval } from '../../services/scheduling/schedulingEngine';
import {
  createCalendarEvent,
  getOrInitCalendarPreferences,
  listCalendars,
  listCalendarEvents,
  listBusyIntervals,
  updateCalendarEvent,
  type CalendarEventRef,
  type CalendarEvent,
  type CalendarRef,
} from '../../services/plan/calendarApi';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { getAvailabilityForDate, getWindowsForMode } from '../../services/plan/planAvailability';
import { proposeDailyPlan, type DailyPlanProposal } from '../../services/plan/planScheduling';
import { formatDayLabel, setTimeOnDate, toLocalDateKey } from '../../services/plan/planDates';
import { inferSchedulingDomain } from '../../services/scheduling/inferSchedulingDomain';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { useToastStore } from '../../store/useToastStore';
import { BottomGuide } from '../../ui/BottomGuide';
import { Button } from '../../ui/Button';
import { reconcilePlanCalendarEvents } from '../../services/plan/planCalendarReconcile';

export type PlanPagerInsetMode = 'screen' | 'drawer';
export type PlanPagerEntryPoint = 'manual' | 'kickoff';

type PlanRecommendation = {
  activityId: string;
  title: string;
  goalTitle?: string | null;
  arcTitle?: string | null;
  proposal: DailyPlanProposal;
};

export function PlanPager({
  insetMode = 'screen',
  targetDate,
  entryPoint = 'manual',
  recommendationsSheetSnapIndex: controlledSheetSnapIndex,
  onRecommendationsSheetSnapIndexChange,
  onRecommendationsCountChange,
  onNavigateDay,
}: {
  insetMode?: PlanPagerInsetMode;
  targetDate: Date;
  entryPoint?: PlanPagerEntryPoint;
  /**
   * Recommendations drawer state.
   * 0 = closed, 1 = open.
   */
  recommendationsSheetSnapIndex?: number;
  onRecommendationsSheetSnapIndexChange?: (index: number) => void;
  onRecommendationsCountChange?: (count: number) => void;
  /** Called when the user swipes the calendar canvas left/right to change day. */
  onNavigateDay?: (deltaDays: number) => void;
}) {
  const [uncontrolledSheetSnapIndex, setUncontrolledSheetSnapIndex] = useState(0);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());
  const [allowRerun, setAllowRerun] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [readRefs, setReadRefs] = useState<CalendarRef[]>([]);
  const [writeRef, setWriteRef] = useState<CalendarRef | null>(null);
  const [externalBusyIntervals, setExternalBusyIntervals] = useState<BusyInterval[]>([]);
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [calendarColorByRefKey, setCalendarColorByRefKey] = useState<Record<string, string>>({});
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[]>([]);
  const [busyIntervalsStatus, setBusyIntervalsStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [prefetchStatus, setPrefetchStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [prefetched, setPrefetched] = useState<{
    startISO: string;
    endISO: string;
    events: CalendarEvent[];
    intervals: BusyInterval[];
    fetchedAtMs: number;
  } | null>(null);
  const [proposals, setProposals] = useState<DailyPlanProposal[]>([]);
  const [committingActivityId, setCommittingActivityId] = useState<string | null>(null);
  const [commitSuccessGuideVisible, setCommitSuccessGuideVisible] = useState(false);
  const [peekSelection, setPeekSelection] = useState<
    | null
    | { kind: 'activity'; activityId: string }
    | {
        kind: 'external';
        event: { title: string; start: Date; end: Date; calendarLabel?: string | null; color?: string | null };
      }
  >(null);

  const activities = useAppStore((s) => s.activities);
  const goals = useAppStore((s) => s.goals);
  const arcs = useAppStore((s) => s.arcs);
  const userProfile = useAppStore((s) => s.userProfile);
  const updateActivity = useAppStore((s) => s.updateActivity);
  const dailyPlanHistory = useAppStore((s) => s.dailyPlanHistory);
  const addDailyPlanCommitment = useAppStore((s) => s.addDailyPlanCommitment);
  const setDailyPlanRecord = useAppStore((s) => s.setDailyPlanRecord);
  const showToast = useToastStore((s) => s.showToast);

  const dateKey = useMemo(() => toLocalDateKey(targetDate), [targetDate]);
  const dayAvailability = useMemo(() => getAvailabilityForDate(userProfile, targetDate), [userProfile, targetDate]);
  const plannedRecord = dailyPlanHistory?.[dateKey] ?? null;
  const hasAnyCommitment = (plannedRecord?.committedActivityIds?.length ?? 0) > 0;

  // Smooth horizontal day transition (swipe only).
  const { width: screenWidth } = useWindowDimensions();
  const canvasTranslateX = useSharedValue(0);
  const canvasWidth = useSharedValue(Math.max(1, screenWidth));
  const isDayTransitionAnimating = useSharedValue(false);

  useEffect(() => {
    canvasWidth.value = Math.max(1, screenWidth);
  }, [screenWidth, canvasWidth]);

  const sheetSnapIndex = controlledSheetSnapIndex ?? uncontrolledSheetSnapIndex;
  const recommendationsDrawerVisible = sheetSnapIndex > 0;
  const setSheetSnapIndex = useCallback(
    (next: number) => {
      onRecommendationsSheetSnapIndexChange?.(next);
      if (controlledSheetSnapIndex == null) {
        setUncontrolledSheetSnapIndex(next);
      }
    },
    [controlledSheetSnapIndex, onRecommendationsSheetSnapIndexChange],
  );

  useEffect(() => {
    if (!recommendationsDrawerVisible) return;
    // Guardrail: if the user opens the recommendations drawer after changing calendar settings,
    // ensure we aren't using stale prefs (PlanPager remains mounted across navigation).
    let active = true;
    (async () => {
      try {
        await refreshPreferences();
      } catch (err: any) {
        if (!active) return;
        setCalendarError(typeof err?.message === 'string' ? err.message : 'calendar_unavailable');
        setReadRefs([]);
        setWriteRef(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [recommendationsDrawerVisible, refreshPreferences]);

  // In the Plan tab (`insetMode="screen"`), the page is hosted inside `AppShell`,
  // which already applies the canonical horizontal gutters. In drawer contexts,
  // the drawer surface supplies its own gutter as well. So: avoid double-padding.
  const pagePadding = 0;

  useEffect(() => {
    if (!commitSuccessGuideVisible) return;
    const timeoutId = setTimeout(() => {
      setCommitSuccessGuideVisible(false);
    }, 2400);
    return () => clearTimeout(timeoutId);
  }, [commitSuccessGuideVisible]);

  useEffect(() => {
    setAllowRerun(false);
    setSkippedIds(new Set());
  }, [dateKey]);

  const refreshPreferences = useCallback(async () => {
    const prefs = await getOrInitCalendarPreferences();
    setReadRefs(prefs.readCalendarRefs ?? []);
    setWriteRef(prefs.writeCalendarRef ?? null);
    setCalendarError(null);
  }, []);

  const refreshCalendarColors = useCallback(async () => {
    try {
      const cals = await listCalendars();
      const next: Record<string, string> = {};
      for (const c of cals) {
        const key = `${c.provider}:${c.accountId}:${c.calendarId}`;
        const color = typeof c.color === 'string' && c.color.trim().length > 0 ? c.color.trim() : null;
        if (color) next[key] = color;
      }
      setCalendarColorByRefKey(next);
    } catch {
      // best-effort; day view will fall back to default event colors
      setCalendarColorByRefKey({});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Calendar settings live in a different stack. When the user returns to Plan after
      // changing calendar prefs, this component stays mounted, so we must refresh on focus.
      let active = true;
      (async () => {
        try {
          await refreshPreferences();
          await refreshCalendarColors();
        } catch (err: any) {
          if (!active) return;
          setCalendarError(typeof err?.message === 'string' ? err.message : 'calendar_unavailable');
          setReadRefs([]);
          setWriteRef(null);
          setCalendarColorByRefKey({});
        }
      })();
      return () => {
        active = false;
      };
    }, [refreshPreferences, refreshCalendarColors]),
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshPreferences();
        await refreshCalendarColors();
      } catch (err: any) {
        if (!mounted) return;
        setCalendarError(typeof err?.message === 'string' ? err.message : 'calendar_unavailable');
        setReadRefs([]);
        setWriteRef(null);
        setCalendarColorByRefKey({});
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshPreferences, refreshCalendarColors]);

  const kwiltBlocks = useMemo(() => {
    return activities
      .filter((a) => {
        if (!a.scheduledAt) return false;
        const d = new Date(a.scheduledAt);
        if (Number.isNaN(d.getTime())) return false;
        return toLocalDateKey(d) === dateKey;
      })
      .map((a) => {
        const start = new Date(a.scheduledAt as string);
        const duration = Math.max(10, a.estimateMinutes ?? 30);
        const end = new Date(start.getTime() + duration * 60000);
        return {
          activity: a,
          start,
          end,
        };
      });
  }, [activities, dateKey]);

  function startOfLocalDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function addDays(d: Date, deltaDays: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + deltaDays);
    return x;
  }

  function clampIntervalsToDay(input: BusyInterval[], dayStart: Date, dayEnd: Date): BusyInterval[] {
    const out: BusyInterval[] = [];
    for (const it of input) {
      const s = it.start;
      const e = it.end;
      if (!(s instanceof Date) || !(e instanceof Date)) continue;
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) continue;
      if (e <= dayStart || s >= dayEnd) continue;
      out.push({
        start: s < dayStart ? dayStart : s,
        end: e > dayEnd ? dayEnd : e,
      });
    }
    return out;
  }

  // Prefetch external data for a 15-day window centered on "today" so day swipes render instantly.
  useEffect(() => {
    if (calendarError) return;
    if (!readRefs || readRefs.length === 0) return;
    let mounted = true;
    (async () => {
      try {
        setPrefetchStatus('loading');
        const todayStart = startOfLocalDay(new Date());
        const windowStart = addDays(todayStart, -7);
        const windowEnd = addDays(todayStart, 8); // exclusive end (covers today + 7 ahead)
        const startISO = windowStart.toISOString();
        const endISO = windowEnd.toISOString();

        const [{ intervals }, { events, errors }] = await Promise.all([
          listBusyIntervals({ start: startISO, end: endISO, readCalendarRefs: readRefs }),
          listCalendarEvents({ start: startISO, end: endISO, readCalendarRefs: readRefs }),
        ]);
        if (!mounted) return;

        const externalIntervals = (intervals ?? []).map((i) => ({ start: new Date(i.start), end: new Date(i.end) }));
        setPrefetched({
          startISO,
          endISO,
          events: Array.isArray(events) ? events : [],
          intervals: externalIntervals,
          fetchedAtMs: Date.now(),
        });
        setPrefetchStatus('ready');

        if (Array.isArray(errors) && errors.length > 0) {
          const msg = 'Some calendars failed to load. Try reconnecting in Settings → Calendars.';
          showToast({ message: msg, variant: 'danger', durationMs: 7000 });
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[PlanPager] prefetch list_events errors:', errors);
          }
        }
      } catch (err) {
        if (!mounted) return;
        setPrefetchStatus('error');
        // Keep day-level fallback fetch below as a backstop.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [calendarError, readRefs]);

  useEffect(() => {
    if (calendarError) {
      setExternalBusyIntervals([]);
      setExternalEvents([]);
      setBusyIntervals([]);
      setBusyIntervalsStatus('error');
      return;
    }
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Fast path: if the day is inside our prefetched window, slice from cache.
    if (prefetched && prefetchStatus === 'ready') {
      const rangeStart = new Date(prefetched.startISO);
      const rangeEnd = new Date(prefetched.endISO);
      const inRange = dayStart >= rangeStart && dayEnd <= rangeEnd;
      if (inRange) {
        const extBusy = clampIntervalsToDay(prefetched.intervals, dayStart, dayEnd);
        setExternalBusyIntervals(extBusy);
        // Pass the whole prefetched event list; the lens page filters per-day.
        setExternalEvents(prefetched.events);
        setBusyIntervals([...extBusy, ...kwiltBlocks.map((b) => ({ start: b.start, end: b.end }))]);
        setBusyIntervalsStatus('ready');
        return;
      }
    }

    let mounted = true;
    (async () => {
      try {
        setBusyIntervalsStatus('loading');
        const { intervals } = await listBusyIntervals({
          start: dayStart.toISOString(),
          end: dayEnd.toISOString(),
          readCalendarRefs: readRefs,
        });
        const { events, errors } = await listCalendarEvents({
          start: dayStart.toISOString(),
          end: dayEnd.toISOString(),
          readCalendarRefs: readRefs,
        });
        if (!mounted) return;
        const external = intervals.map((i) => ({
          start: new Date(i.start),
          end: new Date(i.end),
        }));
        setExternalBusyIntervals(external);
        setExternalEvents(Array.isArray(events) ? events : []);
        if (Array.isArray(errors) && errors.length > 0) {
          const msg = 'Some calendars failed to load. Try reconnecting in Settings → Calendars.';
          // We still show any events we did load; this is a non-fatal warning.
          showToast({ message: msg, variant: 'danger', durationMs: 7000 });
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[PlanPager] list_events errors:', errors);
          }
        }
        setBusyIntervals([...external, ...kwiltBlocks.map((b) => ({ start: b.start, end: b.end }))]);
        setBusyIntervalsStatus('ready');
      } catch (err: any) {
        if (!mounted) return;
        setCalendarError(typeof err?.message === 'string' ? err.message : 'calendar_unavailable');
        setExternalBusyIntervals([]);
        setExternalEvents([]);
        setBusyIntervals([]);
        setBusyIntervalsStatus('error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [calendarError, readRefs, targetDate, kwiltBlocks, prefetched, prefetchStatus]);

  useEffect(() => {
    // Avoid showing stale proposals from the previous day while we fetch this day's calendar data.
    // We'll re-propose once busy intervals are loaded.
    if (busyIntervalsStatus !== 'ready') {
      setProposals([]);
      return;
    }
    const next = proposeDailyPlan({
      activities,
      goals,
      arcs,
      userProfile,
      targetDate,
      busyIntervals,
      writeCalendarId: writeRef?.calendarId ?? null,
      maxItems: 4,
    });
    setProposals(next);
  }, [activities, goals, arcs, userProfile, targetDate, busyIntervals, writeRef, busyIntervalsStatus]);

  const recommendations = useMemo<PlanRecommendation[]>(() => {
    const goalById = new Map(goals.map((g) => [g.id, g]));
    const arcById = new Map(arcs.map((a) => [a.id, a]));
    return proposals
      .filter((p) => !skippedIds.has(p.activityId))
      .map((p) => {
        const activity = activities.find((a) => a.id === p.activityId);
        const goal = activity?.goalId ? goalById.get(activity.goalId) : null;
        const arc = goal?.arcId ? arcById.get(goal.arcId) : null;
        return {
          activityId: p.activityId,
          title: activity?.title ?? p.title,
          goalTitle: goal?.title ?? null,
          arcTitle: arc?.name ?? null,
          proposal: p,
        };
      });
  }, [proposals, skippedIds, activities, goals, arcs]);

  useEffect(() => {
    onRecommendationsCountChange?.(recommendations.length);
  }, [recommendations.length, onRecommendationsCountChange]);

  const hasEligibleActivities = useMemo(() => {
    return activities.some((a) => a.status !== 'done' && a.status !== 'cancelled' && !a.scheduledAt);
  }, [activities]);

  const hasAvailabilityWindows = useMemo(() => {
    if (!dayAvailability.enabled) return false;
    const windows = [
      ...(dayAvailability.windows?.work ?? []),
      ...(dayAvailability.windows?.personal ?? []),
    ];
    return windows.length > 0;
  }, [dayAvailability]);

  const hasCalendarConfigured = Boolean(writeRef);
  const authRequired = useMemo(() => {
    if (!calendarError) return false;
    const message = calendarError.toLowerCase();
    return message.includes('access token') || message.includes('unauthorized');
  }, [calendarError]);

  const calendarStatus: 'unknown' | 'connected' | 'missing' = authRequired ? 'missing' : 'connected';

  const reconciledExternal = useMemo(() => {
    return reconcilePlanCalendarEvents({ externalEvents, kwiltBlocks });
  }, [externalEvents, kwiltBlocks]);

  const externalEventsForTimeline = reconciledExternal.externalEvents;

  const conflicts = useMemo(() => {
    if (kwiltBlocks.length === 0) return [];

    // Prefer event-level overlap checks so we can ignore external duplicates of Kwilt blocks.
    // Fallback to busy intervals only when no events were loaded.
    const conflictIntervals =
      externalEventsForTimeline.length > 0
        ? externalEventsForTimeline
            .map((e) => {
              const start = new Date(e.start);
              const end = new Date(e.end);
              if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
              return { start, end };
            })
            .filter(Boolean) as Array<{ start: Date; end: Date }>
        : externalBusyIntervals;

    if (conflictIntervals.length === 0) return [];

    return kwiltBlocks
      .filter((block) => conflictIntervals.some((busy) => busy.start < block.end && block.start < busy.end))
      .map((block) => block.activity.id);
  }, [externalBusyIntervals, externalEventsForTimeline, kwiltBlocks]);

  function getCommitAlertForError(err: unknown): { title: string; message: string } | null {
    const raw =
      err instanceof Error
        ? err.message
        : typeof (err as any)?.message === 'string'
          ? String((err as any).message)
          : '';
    const msg = (raw ?? '').trim();
    const lower = msg.toLowerCase();

    // If the user actively cancels sign-in, don't show an "error" alert.
    if (lower.includes('sign-in cancelled') || lower.includes('signin cancelled') || lower.includes('cancelled')) {
      return null;
    }

    // Auth missing/expired.
    if (lower.includes('missing access token') || lower.includes('unauthorized') || lower.includes('access token')) {
      return {
        title: 'Sign in required',
        message: 'Please sign in again to connect calendars and commit your plan.',
      };
    }

    // Provider permission / write access denied.
    if (
      lower.includes('forbidden') ||
      lower.includes('insufficient') ||
      lower.includes('permission') ||
      lower.includes('(403)') ||
      lower.includes('request failed (403)')
    ) {
      return {
        title: 'Calendar access denied',
        message: 'Kwilt can’t write to that calendar. Try picking a different write calendar or reconnecting your calendar account in Settings.',
      };
    }

    // Generic fallback.
    return { title: 'Unable to commit', message: 'Please check your calendar connection and try again.' };
  }

  async function verifyCommitLikelySucceeded(args: {
    proposal: DailyPlanProposal;
    writeRef: CalendarRef;
  }): Promise<boolean> {
    try {
      const start = new Date(args.proposal.startDate);
      const end = new Date(args.proposal.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
      const padMs = 5 * 60 * 1000;
      const paddedStart = new Date(start.getTime() - padMs);
      const paddedEnd = new Date(end.getTime() + padMs);
      const { intervals = [] } = await listBusyIntervals({
        start: paddedStart.toISOString(),
        end: paddedEnd.toISOString(),
        // Force-check the write calendar even if the user didn't add it to "read" calendars.
        readCalendarRefs: [args.writeRef],
      });
      return intervals.some((i) => {
        const s = new Date(i.start);
        const e = new Date(i.end);
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
        return s < end && start < e;
      });
    } catch {
      return false;
    }
  }

  function applyLocalCommit(args: {
    activityId: string;
    proposal: DailyPlanProposal;
    eventRef?: CalendarEventRef | null;
  }) {
    const timestamp = new Date().toISOString();
    try {
      updateActivity(args.activityId, (prev) => ({
        ...prev,
        scheduledAt: args.proposal.startDate,
        scheduledProvider: args.eventRef?.provider ?? prev.scheduledProvider,
        scheduledProviderAccountId: args.eventRef?.accountId ?? prev.scheduledProviderAccountId,
        scheduledProviderCalendarId: args.eventRef?.calendarId ?? prev.scheduledProviderCalendarId,
        scheduledProviderEventId: args.eventRef?.eventId ?? prev.scheduledProviderEventId,
        updatedAt: timestamp,
      }));
      addDailyPlanCommitment(dateKey, args.activityId);
    } catch (e) {
      // Never show a hard error if the calendar side-effect likely succeeded.
      // If local state update fails, the next sync/reload will reconcile.
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[PlanPager] Local commit update failed:', e);
      }
    }
  }

  function showCommitSuccessFeedback() {
    if (insetMode === 'drawer') {
      setCommitSuccessGuideVisible(true);
    } else {
      showToast({
        message: 'Added to your calendar.',
        variant: 'light',
        actionLabel: 'Review',
        actionOnPress: () => setSheetSnapIndex(0),
      });
    }
  }

  const handleCommit = async (activityId: string) => {
    const proposal = proposals.find((p) => p.activityId === activityId);
    const activity = activities.find((a) => a.id === activityId);
    if (!proposal || !activity) return;
    if (!writeRef) {
      Alert.alert('Choose a calendar', 'Select a write calendar in Settings before committing.');
      return;
    }
    if (committingActivityId) return;

    try {
      setCommittingActivityId(activityId);
      await ensureSignedInWithPrompt('plan');
      let eventRef: CalendarEventRef | null = null;
      try {
        const res = await createCalendarEvent({
          title: proposal.title,
          start: proposal.startDate,
          end: proposal.endDate,
          writeCalendarRef: writeRef,
        });
        eventRef = (res as any)?.eventRef ?? null;
      } catch (err) {
        // Sometimes the calendar side-effect succeeds but the network response fails
        // (timeouts, HTML error bodies, etc.). Best-effort verify via busy intervals.
        const likelySucceeded = await verifyCommitLikelySucceeded({ proposal, writeRef });
        if (likelySucceeded) {
          applyLocalCommit({ activityId, proposal, eventRef: null });
          showCommitSuccessFeedback();
          return;
        }
        const alert = getCommitAlertForError(err);
        if (alert) Alert.alert(alert.title, alert.message);
        return;
      }

      // Even if we didn't get an eventRef payload (e.g. non-JSON body), we still treat
      // this as a successful commit. We just won't be able to support moves reliably.
      if (!eventRef) {
        const likelySucceeded = await verifyCommitLikelySucceeded({ proposal, writeRef });
        if (!likelySucceeded) {
          // If we can't verify, still show a softer message (no false “Unable to commit”).
          Alert.alert('Check your calendar', 'We may have added this time block, but we couldn’t confirm it. Please check your calendar.');
          return;
        }
      }

      applyLocalCommit({ activityId, proposal, eventRef });
      showCommitSuccessFeedback();
    } catch (err) {
      const alert = getCommitAlertForError(err);
      if (alert) Alert.alert(alert.title, alert.message);
    } finally {
      setCommittingActivityId(null);
    }
  };

  const isWithinWindows = useCallback(
    (mode: 'work' | 'personal', start: Date, end: Date) => {
      if (!dayAvailability.enabled) return false;
      const windows = getWindowsForMode(dayAvailability, mode);
      return windows.some((w) => {
        const ws = setTimeOnDate(targetDate, w.start);
        const we = setTimeOnDate(targetDate, w.end);
        if (!ws || !we) return false;
        return start >= ws && end <= we;
      });
    },
    [dayAvailability, targetDate],
  );

  const handleMoveRecommendation = (activityId: string, newStart: Date) => {
    const proposal = proposals.find((p) => p.activityId === activityId);
    const activity = activities.find((a) => a.id === activityId);
    if (!proposal || !activity) return;
    const duration = Math.max(10, activity.estimateMinutes ?? 30);
    const newEnd = new Date(newStart.getTime() + duration * 60000);
    const mode = inferSchedulingDomain(activity, goals).toLowerCase().includes('work') ? 'work' : 'personal';
    if (!isWithinWindows(mode, newStart, newEnd)) {
      Alert.alert('Outside availability', 'Pick a time within your availability windows.');
      return;
    }
    const otherProposalIntervals = proposals
      .filter((p) => p.activityId !== activityId)
      .map((p) => ({ start: new Date(p.startDate), end: new Date(p.endDate) }));
    const conflicts =
      busyIntervals.some((b) => b.start < newEnd && newStart < b.end) ||
      otherProposalIntervals.some((b) => b.start < newEnd && newStart < b.end);
    if (conflicts) {
      Alert.alert('Time conflict', 'That time conflicts with your calendar.');
      return;
    }
    setProposals((prev) =>
      prev.map((p) =>
        p.activityId === activityId
          ? { ...p, startDate: newStart.toISOString(), endDate: newEnd.toISOString() }
          : p,
      ),
    );
  };

  const handleMoveCommitment = async (activityId: string, newStart: Date) => {
    const block = kwiltBlocks.find((b) => b.activity.id === activityId);
    if (!block) return;
    const activity = block.activity;
    const duration = Math.max(10, activity.estimateMinutes ?? 30);
    const newEnd = new Date(newStart.getTime() + duration * 60000);
    const mode = inferSchedulingDomain(activity, goals).toLowerCase().includes('work') ? 'work' : 'personal';
    if (!isWithinWindows(mode, newStart, newEnd)) {
      Alert.alert('Outside availability', 'Pick a time within your availability windows.');
      return;
    }
    const conflicts = externalBusyIntervals.some((b) => b.start < newEnd && newStart < b.end);
    if (conflicts) {
      Alert.alert('Time conflict', 'That time conflicts with your calendar.');
      return;
    }
    if (
      !activity.scheduledProvider ||
      !activity.scheduledProviderAccountId ||
      !activity.scheduledProviderCalendarId ||
      !activity.scheduledProviderEventId
    ) {
      Alert.alert('Unable to move', 'Recommit this block to enable moves.');
      return;
    }
    try {
      await ensureSignedInWithPrompt('plan');
      const eventRef: CalendarEventRef = {
        provider: activity.scheduledProvider,
        accountId: activity.scheduledProviderAccountId,
        calendarId: activity.scheduledProviderCalendarId,
        eventId: activity.scheduledProviderEventId,
      };
      await updateCalendarEvent({
        eventRef,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
      const timestamp = new Date().toISOString();
      updateActivity(activityId, (prev) => ({
        ...prev,
        scheduledAt: newStart.toISOString(),
        updatedAt: timestamp,
      }));
    } catch {
      Alert.alert('Unable to move', 'Please check calendar permissions and try again.');
    }
  };

  const handleSkip = (activityId: string) => {
    setSkippedIds((prev) => new Set(prev).add(activityId));
  };

  const handleRequestAuth = async () => {
    try {
      await ensureSignedInWithPrompt('plan');
      await refreshPreferences();
    } catch {
      Alert.alert('Sign in required', 'Please sign in to connect calendars.');
    }
  };

  const handleRerun = () => {
    setDailyPlanRecord(dateKey, null);
    setAllowRerun(true);
  };

  const emptyState = useMemo(() => {
    if (!dayAvailability.enabled) {
      return {
        title: 'Rest day',
        description: 'Today is set as a rest day. Kwilt will suggest later.',
      };
    }
    if (!hasAvailabilityWindows) {
      return {
        title: 'No available windows',
        description: 'Your availability has no windows for this day.',
      };
    }
    if (!hasEligibleActivities) {
      return {
        title: 'Nothing to recommend',
        description: 'Add more activities to see recommendations.',
      };
    }
    if (authRequired) {
      return {
        title: 'Sign in to connect calendars',
        description: 'Sign in to connect your Google and Outlook calendars.',
      };
    }
    if (!hasCalendarConfigured) {
      return {
        title: 'Choose a calendar',
        description: 'Select a write calendar in Settings to commit a plan.',
      };
    }
    return {
      title: 'Day is full',
      description: 'No free time remains in your availability windows.',
    };
  }, [dayAvailability, hasAvailabilityWindows, hasEligibleActivities, hasCalendarConfigured, authRequired]);

  const isLoadingRecommendations = calendarStatus !== 'missing' && busyIntervalsStatus === 'loading';

  // A day should only be considered "already set" when the user has committed at least one
  // block AND there are no remaining recommendations to show. Committing a single item
  // should not hide the rest of the recommended blocks.
  const showAlreadyPlanned = hasAnyCommitment && !allowRerun && !isLoadingRecommendations && proposals.length === 0;

  const canvasAnimatedStyle = useAnimatedStyle(() => {
    // Small opacity dip during the off-screen transition reduces the “hard cut” feel.
    const w = Math.max(1, canvasWidth.value);
    const t = Math.min(1, Math.abs(canvasTranslateX.value) / w);
    const opacity = 1 - 0.12 * t;
    return {
      transform: [{ translateX: canvasTranslateX.value }],
      opacity,
    };
  });

  const swipeGesture = useMemo(() => {
    const enabled = typeof onNavigateDay === 'function' && !recommendationsDrawerVisible && !peekSelection;
    if (!enabled) {
      return Gesture.Pan().enabled(false);
    }
    return (
      Gesture.Pan()
        // Require intentional horizontal motion; fail quickly on vertical scroll.
        .activeOffsetX([-28, 28])
        .failOffsetY([-18, 18])
        .onEnd((e) => {
          'worklet';
          if (isDayTransitionAnimating.value) return;
          const dx = e.translationX ?? 0;
          const vx = e.velocityX ?? 0;
          const absDx = Math.abs(dx);
          if (absDx < 70 && Math.abs(vx) < 650) return;
          // Swipe left = next day, swipe right = previous day.
          const direction = dx < 0 ? 1 : -1;
          const w = Math.max(1, canvasWidth.value);
          isDayTransitionAnimating.value = true;

          // Phase 1: slide current day out.
          canvasTranslateX.value = withTiming(
            -direction * w,
            { duration: 170, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (!finished) {
                canvasTranslateX.value = 0;
                isDayTransitionAnimating.value = false;
                return;
              }

              // Swap the day on JS thread.
              runOnJS(onNavigateDay)(direction);

              // Phase 2: jump the new day off-screen (opposite side) then slide in.
              canvasTranslateX.value = direction * w;
              canvasTranslateX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }, () => {
                isDayTransitionAnimating.value = false;
              });
            },
          );
        })
    );
  }, [onNavigateDay, recommendationsDrawerVisible, peekSelection, canvasTranslateX, canvasWidth, isDayTransitionAnimating]);

  const handleOpenFocus = useCallback((activityId: string) => {
    if (!rootNavigationRef.isReady()) return;
    rootNavigationRef.navigate('Activities', {
      screen: 'ActivityDetail',
      params: { activityId, openFocus: true },
    } as any);
  }, []);

  const handleOpenFullActivity = useCallback((activityId: string) => {
    if (!rootNavigationRef.isReady()) return;
    rootNavigationRef.navigate('Activities', {
      screen: 'ActivityDetail',
      params: { activityId },
    } as any);
  }, []);

  const drawerMode: PlanDrawerMode | null = peekSelection
    ? peekSelection.kind === 'activity'
      ? kwiltBlocks.some((b) => b.activity.id === peekSelection.activityId)
        ? 'activity'
        : null
      : 'external'
    : recommendationsDrawerVisible
      ? 'recs'
      : null;

  const handleDrawerClose = useCallback(() => {
    if (peekSelection) {
      setPeekSelection(null);
      return;
    }
    setSheetSnapIndex(0);
  }, [peekSelection, setSheetSnapIndex]);

  const activityPeekModel = useMemo(() => {
    if (!peekSelection || peekSelection.kind !== 'activity') return null;
    const block = kwiltBlocks.find((b) => b.activity.id === peekSelection.activityId) ?? null;
    if (!block) return null;
    const conflict = conflicts.includes(peekSelection.activityId);
    return {
      activityId: peekSelection.activityId,
      start: block.start,
      end: block.end,
      conflict,
      onOpenFocus: handleOpenFocus,
      onOpenFullActivity: handleOpenFullActivity,
      onMoveCommitment: handleMoveCommitment,
      onRequestClose: () => setPeekSelection(null),
    };
  }, [conflicts, handleMoveCommitment, handleOpenFocus, handleOpenFullActivity, kwiltBlocks, peekSelection]);

  const externalPeekModel = useMemo(() => {
    if (!peekSelection || peekSelection.kind !== 'external') return null;
    return {
      title: peekSelection.event.title,
      start: peekSelection.event.start,
      end: peekSelection.event.end,
      calendarLabel: peekSelection.event.calendarLabel ?? null,
      color: peekSelection.event.color ?? null,
      onRequestClose: () => setPeekSelection(null),
    };
  }, [peekSelection]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[{ flex: 1 }, canvasAnimatedStyle]}>
          <PlanCalendarLensPage
            contentPadding={pagePadding}
            targetDayLabel={formatDayLabel(targetDate)}
            targetDate={targetDate}
            externalEvents={externalEventsForTimeline}
            calendarColorByRefKey={calendarColorByRefKey}
            isLoadingExternal={busyIntervalsStatus === 'loading'}
            // Don't paint recommendations onto the calendar canvas when the drawer is closed.
            // Otherwise they read like real scheduled blocks and visually "repeat" on every day.
            proposedBlocks={
              recommendationsDrawerVisible
                ? proposals.map((p) => ({
                    title: p.title,
                    start: new Date(p.startDate),
                    end: new Date(p.endDate),
                  }))
                : []
            }
            kwiltBlocks={kwiltBlocks}
            conflictActivityIds={conflicts}
            calendarStatus={calendarStatus}
            onOpenCalendarSettings={() => {
              if (rootNavigationRef.isReady()) {
                rootNavigationRef.navigate('Settings', { screen: 'SettingsPlanCalendars' } as any);
              }
            }}
            onMoveCommitment={handleMoveCommitment}
            onPressKwiltBlock={(activityId) => {
              if (recommendationsDrawerVisible) setSheetSnapIndex(0);
              setPeekSelection({ kind: 'activity', activityId });
            }}
            onPressExternalEvent={(event) => {
              if (recommendationsDrawerVisible) setSheetSnapIndex(0);
              setPeekSelection({ kind: 'external', event });
            }}
          />
        </Animated.View>
      </GestureDetector>

      {drawerMode ? (
        <PlanEventPeekDrawerHost
          visible
          mode={drawerMode}
          onClose={handleDrawerClose}
          recommendations={
            drawerMode === 'recs'
              ? {
                  recommendationCount: recommendations.length,
                  targetDayLabel: formatDayLabel(targetDate),
                  recommendations: recommendations.map((r) => ({
                    activityId: r.activityId,
                    title: r.title,
                    goalTitle: r.goalTitle,
                    arcTitle: r.arcTitle,
                    proposal: { startDate: r.proposal.startDate, endDate: r.proposal.endDate },
                  })),
                  emptyState,
                  isLoading: isLoadingRecommendations,
                  showAlreadyPlanned,
                  entryPoint,
                  calendarStatus,
                  onOpenCalendarSettings: () => {
                    if (rootNavigationRef.isReady()) {
                      rootNavigationRef.navigate('Settings', { screen: 'SettingsPlanCalendars' } as any);
                    }
                  },
                  onReviewPlan: () => setSheetSnapIndex(0),
                  onRerun: handleRerun,
                  onCommit: handleCommit,
                  onMove: handleMoveRecommendation,
                  onSkip: handleSkip,
                  committingActivityId,
                }
              : undefined
          }
          activityPeek={drawerMode === 'activity' ? (activityPeekModel ?? undefined) : undefined}
          externalPeek={drawerMode === 'external' ? (externalPeekModel ?? undefined) : undefined}
        />
      ) : null}

      {/* Drawer-only success confirmation (toast can be hidden under modal layers) */}
      <BottomGuide
        visible={insetMode === 'drawer' && commitSuccessGuideVisible}
        onClose={() => setCommitSuccessGuideVisible(false)}
        snapPoints={['28%']}
        scrim="none"
        dynamicSizing
      >
        <VStack space={spacing.sm}>
          <VStack space={spacing.xs}>
            <Text style={styles.commitGuideTitle}>Added to your calendar</Text>
            <Text style={styles.commitGuideBody}>Your time block is committed successfully.</Text>
          </VStack>
          <HStack space={spacing.sm} style={{ justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setCommitSuccessGuideVisible(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onPress={() => {
                setCommitSuccessGuideVisible(false);
                setSheetSnapIndex(0);
              }}
            >
              Review
            </Button>
          </HStack>
        </VStack>
      </BottomGuide>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  commitGuideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  commitGuideBody: {
    color: colors.textSecondary,
  },
});

