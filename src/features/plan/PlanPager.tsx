import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { HStack } from '../../ui/Stack';
import { useAppStore } from '../../store/useAppStore';
import { PlanRecsPage } from './PlanRecsPage';
import { PlanCalendarLensPage } from './PlanCalendarLensPage';
import type { BusyInterval } from '../../services/scheduling/schedulingEngine';
import {
  createCalendarEvent,
  getCalendarPreferences,
  listBusyIntervals,
  updateCalendarEvent,
  type CalendarEventRef,
  type CalendarRef,
} from '../../services/plan/calendarApi';
import { ensureSignedInWithPrompt } from '../../services/backend/auth';
import { getAvailabilityForDate, getWindowsForMode } from '../../services/plan/planAvailability';
import { proposeDailyPlan, type DailyPlanProposal } from '../../services/plan/planScheduling';
import { formatDayLabel, setTimeOnDate, toLocalDateKey } from '../../services/plan/planDates';
import { inferSchedulingDomain } from '../../services/scheduling/inferSchedulingDomain';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';

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
  activePageIndex: controlledActivePageIndex,
  onActivePageIndexChange,
}: {
  insetMode?: PlanPagerInsetMode;
  targetDate: Date;
  entryPoint?: PlanPagerEntryPoint;
  activePageIndex?: number;
  onActivePageIndexChange?: (index: number) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [pagerWidth, setPagerWidth] = useState(screenWidth);
  const [uncontrolledActiveIndex, setUncontrolledActiveIndex] = useState(0);
  const activeIndex = controlledActivePageIndex ?? uncontrolledActiveIndex;
  const scrollRef = useRef<ScrollView | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());
  const [allowRerun, setAllowRerun] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [readRefs, setReadRefs] = useState<CalendarRef[]>([]);
  const [writeRef, setWriteRef] = useState<CalendarRef | null>(null);
  const [externalBusyIntervals, setExternalBusyIntervals] = useState<BusyInterval[]>([]);
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[]>([]);
  const [proposals, setProposals] = useState<DailyPlanProposal[]>([]);

  const activities = useAppStore((s) => s.activities);
  const goals = useAppStore((s) => s.goals);
  const arcs = useAppStore((s) => s.arcs);
  const userProfile = useAppStore((s) => s.userProfile);
  const updateActivity = useAppStore((s) => s.updateActivity);
  const dailyPlanHistory = useAppStore((s) => s.dailyPlanHistory);
  const addDailyPlanCommitment = useAppStore((s) => s.addDailyPlanCommitment);
  const setDailyPlanRecord = useAppStore((s) => s.setDailyPlanRecord);

  const dateKey = useMemo(() => toLocalDateKey(targetDate), [targetDate]);
  const dayAvailability = useMemo(() => getAvailabilityForDate(userProfile, targetDate), [userProfile, targetDate]);
  const plannedRecord = dailyPlanHistory?.[dateKey] ?? null;
  const showAlreadyPlanned = Boolean(plannedRecord) && !allowRerun;
  const showRecommendations = !showAlreadyPlanned;

  // In the Plan tab (`insetMode="screen"`), the page is hosted inside `AppShell`,
  // which already applies the canonical horizontal gutters. In drawer contexts,
  // the drawer surface supplies its own gutter as well. So: avoid double-padding.
  const pagePadding = 0;

  const setActiveIndex = useCallback(
    (next: number) => {
      onActivePageIndexChange?.(next);
      if (controlledActivePageIndex == null) {
        setUncontrolledActiveIndex(next);
      }
    },
    [controlledActivePageIndex, onActivePageIndexChange],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / Math.max(1, pagerWidth));
      if (index !== activeIndex) {
        setActiveIndex(index);
      }
    },
    [pagerWidth, activeIndex],
  );

  const goToPage = useCallback(
    (index: number) => {
      scrollRef.current?.scrollTo({ x: index * pagerWidth, y: 0, animated: true });
      setActiveIndex(index);
    },
    [pagerWidth],
  );

  useEffect(() => {
    if (controlledActivePageIndex == null) return;
    scrollRef.current?.scrollTo({ x: controlledActivePageIndex * pagerWidth, y: 0, animated: true });
  }, [controlledActivePageIndex, pagerWidth]);

  useEffect(() => {
    setAllowRerun(false);
    setSkippedIds(new Set());
  }, [dateKey]);

  const refreshPreferences = useCallback(async () => {
    const prefs = await getCalendarPreferences();
    setReadRefs(prefs.readCalendarRefs ?? []);
    setWriteRef(prefs.writeCalendarRef ?? null);
    setCalendarError(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshPreferences();
      } catch (err: any) {
        if (!mounted) return;
        setCalendarError(typeof err?.message === 'string' ? err.message : 'calendar_unavailable');
        setReadRefs([]);
        setWriteRef(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshPreferences]);

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

  useEffect(() => {
    if (calendarError) {
      setExternalBusyIntervals([]);
      setBusyIntervals([]);
      return;
    }
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    let mounted = true;
    (async () => {
      try {
        const { intervals } = await listBusyIntervals({
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
        setBusyIntervals([...external, ...kwiltBlocks.map((b) => ({ start: b.start, end: b.end }))]);
      } catch (err: any) {
        if (!mounted) return;
        setCalendarError(typeof err?.message === 'string' ? err.message : 'calendar_unavailable');
        setExternalBusyIntervals([]);
        setBusyIntervals([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [calendarError, readRefs, targetDate, kwiltBlocks]);

  useEffect(() => {
    if (!showRecommendations) {
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
  }, [activities, goals, arcs, userProfile, targetDate, busyIntervals, writeRef, showRecommendations]);

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

  const conflicts = useMemo(() => {
    if (externalBusyIntervals.length === 0 || kwiltBlocks.length === 0) return [];
    return kwiltBlocks
      .filter((block) =>
        externalBusyIntervals.some((busy) => busy.start < block.end && block.start < busy.end),
      )
      .map((block) => block.activity.id);
  }, [externalBusyIntervals, kwiltBlocks]);

  const handleCommit = async (activityId: string) => {
    const proposal = proposals.find((p) => p.activityId === activityId);
    const activity = activities.find((a) => a.id === activityId);
    if (!proposal || !activity) return;
    if (!writeRef) {
      Alert.alert('Choose a calendar', 'Select a write calendar in Settings before committing.');
      return;
    }

    try {
      await ensureSignedInWithPrompt('plan');
      const { eventRef } = await createCalendarEvent({
        title: proposal.title,
        start: proposal.startDate,
        end: proposal.endDate,
        writeCalendarRef: writeRef,
      });
      const timestamp = new Date().toISOString();
      updateActivity(activityId, (prev) => ({
        ...prev,
        scheduledAt: proposal.startDate,
        scheduledProvider: eventRef.provider,
        scheduledProviderAccountId: eventRef.accountId,
        scheduledProviderCalendarId: eventRef.calendarId,
        scheduledProviderEventId: eventRef.eventId,
        updatedAt: timestamp,
      }));
      addDailyPlanCommitment(dateKey, activityId);
      Alert.alert('Committed', 'Added to your calendar.');
    } catch (err) {
      Alert.alert('Unable to commit', 'Please check calendar permissions and try again.');
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

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const nextWidth = e.nativeEvent.layout.width;
        if (nextWidth > 0 && nextWidth !== pagerWidth) {
          setPagerWidth(nextWidth);
        }
      }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        ref={(node) => {
          scrollRef.current = node;
        }}
      >
        <View style={{ width: pagerWidth }}>
          <PlanRecsPage
            contentPadding={pagePadding}
            targetDayLabel={formatDayLabel(targetDate)}
            recommendations={recommendations}
            emptyState={recommendations.length === 0 ? emptyState : null}
            showAlreadyPlanned={showAlreadyPlanned}
            entryPoint={entryPoint}
            onRerun={handleRerun}
            onReviewPlan={() => goToPage(1)}
            calendarStatus={calendarStatus}
            onOpenCalendarSettings={() => {
              if (rootNavigationRef.isReady()) {
                rootNavigationRef.navigate('Settings', { screen: 'SettingsPlanCalendars' } as any);
              }
            }}
            onCommit={handleCommit}
            onMove={handleMoveRecommendation}
            onSkip={handleSkip}
          />
        </View>
        <View style={{ width: pagerWidth }}>
          <PlanCalendarLensPage
            contentPadding={pagePadding}
            targetDayLabel={formatDayLabel(targetDate)}
            externalBusyIntervals={externalBusyIntervals}
            proposedBlocks={proposals.map((p) => ({
              title: p.title,
              start: new Date(p.startDate),
              end: new Date(p.endDate),
            }))}
            kwiltBlocks={kwiltBlocks}
            conflictActivityIds={conflicts}
            calendarStatus={calendarStatus}
            onOpenCalendarSettings={() => {
              if (rootNavigationRef.isReady()) {
                rootNavigationRef.navigate('Settings', { screen: 'SettingsPlanCalendars' } as any);
              }
            }}
            onMoveCommitment={handleMoveCommitment}
            availabilitySummary={
              hasAvailabilityWindows
                ? [
                    ...dayAvailability.windows.work.map(
                      (w) => `Work ${w.start} - ${w.end}`,
                    ),
                    ...dayAvailability.windows.personal.map(
                      (w) => `Personal ${w.start} - ${w.end}`,
                    ),
                  ]
                : []
            }
          />
        </View>
      </ScrollView>

      <View style={styles.paginationContainer}>
        <HStack space={spacing.xs} style={styles.pagination}>
          {[0, 1].map((index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex ? styles.activeDot : styles.inactiveDot]}
            />
          ))}
        </HStack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pagination: {
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: colors.textPrimary,
  },
  inactiveDot: {
    backgroundColor: colors.textSecondary,
    opacity: 0.3,
  },
});

