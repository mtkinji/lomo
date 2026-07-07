import * as React from 'react';
import type { RefObject } from 'react';
import { Keyboard } from 'react-native';
import type { Activity, Goal } from '../../domain/types';
import type { ActivityRepeatRule } from '../../domain/types';
import { spacing } from '../../theme';
import { HapticsService } from '../../services/HapticsService';
import { toLocalDateKey } from '../../services/plan/planDates';
import { getCurrentLocationBestEffort } from '../../services/location/currentLocation';
import { useActivityEnrichmentStore } from '../../store/useActivityEnrichmentStore';

export type QuickAddAiAction = 'steps' | 'triggers' | 'details' | 'cover_image';

export const DEFAULT_QUICK_ADD_AI_ACTIONS: QuickAddAiAction[] = ['steps', 'triggers', 'details'];
const ACTIVITY_ENRICHMENT_ACTIONS: QuickAddAiAction[] = ['steps', 'triggers', 'details'];

type QuickAddSubmitOptions = {
  aiActions?: QuickAddAiAction[];
};

const VALID_REPEAT_RULES: ActivityRepeatRule[] = ['daily', 'weekly', 'weekdays', 'monthly', 'yearly'];
const DEFAULT_LOCATION_TRIGGER_RADIUS_M = 150;

type QuickAddGoalContext = Pick<Goal, 'id' | 'targetDate' | 'priority'>;

type QuickAddCoverImageSelection = Pick<Activity, 'thumbnailUrl' | 'heroImageMeta'>;

export type QuickAddLocationTriggerRecommendation = {
  activityId: string;
  location: NonNullable<Activity['location']>;
};

export function resolveQuickAddLocationTriggerEnrichment(params: {
  enrichment: any;
  currentLocation?: { latitude: number; longitude: number } | null;
  locationTriggersEnabled: boolean;
}): {
  enrichment: any;
  recommendation: NonNullable<Activity['location']> | null;
} {
  const rawEnrichment = params.enrichment ?? {};
  const candidateLocation =
    normalizeTriggerLocation(rawEnrichment?.location) ??
    (params.locationTriggersEnabled && params.currentLocation && !rawEnrichment?.location
      ? {
          label: 'Current location',
          latitude: params.currentLocation.latitude,
          longitude: params.currentLocation.longitude,
          trigger: 'leave' as const,
          radiusM: DEFAULT_LOCATION_TRIGGER_RADIUS_M,
        }
      : null);
  const shouldApplyLocation = Boolean(params.locationTriggersEnabled && candidateLocation);

  return {
    enrichment: {
      ...rawEnrichment,
      ...(shouldApplyLocation ? { location: candidateLocation } : { location: undefined }),
    },
    recommendation: candidateLocation && !shouldApplyLocation ? candidateLocation : null,
  };
}

type ConsumeGenerativeCredit = (params: {
  tier: 'free' | 'pro';
  amount?: number;
}) => { ok: boolean; remaining: number; limit: number };

type ToastPayload = {
  message: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'credits';
  durationMs?: number;
  bottomOffset?: number;
  behaviorDuringSuppression?: 'show' | 'queue' | 'drop';
  actionLabel?: string;
  onPressAction?: () => void;
};

type Params = {
  /**
   * When non-null, new activities created from the dock are linked to this goal.
   */
  goalId: string | null;
  /**
   * Used only as a fallback for legacy call sites. Prefer `getNextOrderIndex`
   * so new items can reliably append/prepend even when `orderIndex` has gaps.
   */
  activitiesCount: number;
  /**
   * Return the next `orderIndex` to use for a newly created activity.
   * This should typically be `(maxVisibleOrderIndex + 1)` to append to the bottom.
   */
  getNextOrderIndex?: () => number;
  /**
   * Optional: provide default Activity fields derived from UI context (e.g. active filters).
   * This is applied in a conservative way (only to fields that aren't explicitly set by the dock).
   */
  getActivityDefaults?: () => Partial<Activity>;
  goals?: QuickAddGoalContext[];
  addActivity: (activity: Activity) => void;
  updateActivity?: (activityId: string, updater: (prev: Activity) => Activity) => void;
  recordShowUp: () => void;
  showToast: (payload: ToastPayload) => void;
  /**
   * Initial reserved height used to pad scroll content before the dock measures itself.
   */
  initialReservedHeightPx: number;
  /**
   * Optional override for the toast bottom offset. Useful for inline placements
   * where `reservedHeight` is not meaningful (dock isn't anchored to the bottom).
   */
  toastBottomOffsetOverridePx?: number;
  /**
   * Called after the activity is created and added to the store.
   * Useful for analytics, scroll-to-new-item, guides, etc.
   */
  onCreated?: (activity: Activity) => void;
  /**
   * Optional: start enrichment after create.
   */
  enrichActivityWithAI?: (params: {
    activityId?: string;
    title: string;
    goalId: string | null;
    activityType?: string;
    existingNotes?: string;
    existingTags?: string[];
    selectedActions?: Array<Exclude<QuickAddAiAction, 'cover_image'>>;
  }) => Promise<any>;
  findCoverImageWithAI?: (params: {
    activityId: string;
    title: string;
    goalId: string | null;
    activityType?: string;
    existingTags?: string[];
  }) => Promise<QuickAddCoverImageSelection | null>;
  markActivityEnrichment?: (activityId: string, enriching: boolean) => void;
  locationTriggersEnabled?: boolean;
  onLocationTriggerRecommended?: (recommendation: QuickAddLocationTriggerRecommendation) => void;
  tryConsumeGenerativeCredit?: ConsumeGenerativeCredit;
  aiCreditTier?: 'free' | 'pro';
  onAiCreditsExhausted?: () => void;
  /**
   * When true (default), re-focus the input after creating an activity to enable rapid entry.
   * When false, callers can dismiss/collapse the dock after submit without it re-opening.
   */
  focusAfterSubmit?: boolean;
};

export function useQuickAddDockController(params: Params) {
  const {
    goalId,
    activitiesCount,
    getNextOrderIndex,
    getActivityDefaults,
    goals,
    addActivity,
    updateActivity,
    recordShowUp,
    showToast,
    initialReservedHeightPx,
    toastBottomOffsetOverridePx,
    onCreated,
    enrichActivityWithAI,
    findCoverImageWithAI,
    markActivityEnrichment,
    locationTriggersEnabled = false,
    onLocationTriggerRecommended,
    tryConsumeGenerativeCredit,
    aiCreditTier = 'free',
    onAiCreditsExhausted,
    focusAfterSubmit = true,
  } = params;

  const [value, setValue] = React.useState('');
  const inputRef = React.useRef<any>(null) as RefObject<any>;
  const [isFocused, setIsFocused] = React.useState(false);

  const [reminderAt, setReminderAt] = React.useState<string | null>(null);
  const [reminderSource, setReminderSource] = React.useState<Activity['reminderSource']>(undefined);
  const [scheduledDate, setScheduledDate] = React.useState<string | null>(null);
  const [repeatRule, setRepeatRule] = React.useState<ActivityRepeatRule | undefined>(undefined);
  const [estimateMinutes, setEstimateMinutes] = React.useState<number | null>(null);
  const markSharedActivityEnrichment = useActivityEnrichmentStore((state) => state.markActivityEnrichment);

  const [reservedHeight, setReservedHeight] = React.useState<number>(initialReservedHeightPx);

  // Tool drawer open/close behavior: collapse the dock (and keyboard) before opening a drawer,
  // then optionally resume focus when the drawer closes.
  const shouldResumeAfterToolRef = React.useRef(false);
  const TOOL_DRAWER_ANIMATION_MS = 280;

  const collapse = React.useCallback(() => {
    setIsFocused(false);
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      inputRef.current?.blur?.();
    });
  }, []);

  const openToolDrawer = React.useCallback(
    (open: () => void) => {
      shouldResumeAfterToolRef.current = isFocused;
      if (isFocused) {
        collapse();
      }
      requestAnimationFrame(() => open());
    },
    [collapse, isFocused],
  );

  const closeToolDrawer = React.useCallback(
    (close: () => void) => {
      close();
      if (!shouldResumeAfterToolRef.current) return;
      shouldResumeAfterToolRef.current = false;
      setTimeout(() => {
        setIsFocused(true);
      }, TOOL_DRAWER_ANIMATION_MS);
    },
    [],
  );

  const toastBottomOffset = React.useMemo(() => {
    if (typeof toastBottomOffsetOverridePx === 'number' && Number.isFinite(toastBottomOffsetOverridePx)) {
      return toastBottomOffsetOverridePx;
    }
    return reservedHeight + spacing.sm;
  }, [reservedHeight, toastBottomOffsetOverridePx]);

  const submit = React.useCallback((options?: QuickAddSubmitOptions) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const aiActions = options?.aiActions ?? DEFAULT_QUICK_ADD_AI_ACTIONS;
    const enrichmentActions = aiActions.filter((action) =>
      ACTIVITY_ENRICHMENT_ACTIONS.includes(action)
    ) as Array<Exclude<QuickAddAiAction, 'cover_image'>>;
    const shouldFindCoverImage = aiActions.includes('cover_image') && Boolean(findCoverImageWithAI && updateActivity);
    const shouldEnrichWithAI = enrichmentActions.length > 0 && Boolean(enrichActivityWithAI && updateActivity);
    const shouldRunAiActions = shouldEnrichWithAI || shouldFindCoverImage;
    if (
      shouldRunAiActions &&
      !consumeQuickAddAiActionCredits(aiActions, {
        tier: aiCreditTier,
        tryConsumeGenerativeCredit,
      })
    ) {
      onAiCreditsExhausted?.();
      return;
    }

    const timestamp = new Date().toISOString();
    const id = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const defaults: Partial<Activity> = (() => {
      try {
        const v = getActivityDefaults?.();
        return v && typeof v === 'object' ? v : {};
      } catch {
        return {};
      }
    })();
    const nextOrderIndex = (() => {
      try {
        const v = getNextOrderIndex?.();
        if (typeof v === 'number' && Number.isFinite(v)) return v;
      } catch {
        // best-effort only; fall back to count-based ordering
      }
      return (activitiesCount || 0) + 1;
    })();
    const resolvedGoalId = goalId ?? (typeof defaults.goalId === 'string' ? defaults.goalId : null) ?? null;
    const goalContext =
      resolvedGoalId && Array.isArray(goals)
        ? goals.find((candidate) => candidate.id === resolvedGoalId) ?? null
        : null;
    const resolvedStatus = (() => {
      const s = (defaults as any)?.status;
      // Quick-add is for planning; avoid creating "done/cancelled/skipped" rows by default.
      if (s === 'planned' || s === 'in_progress') return s;
      return 'planned';
    })() as any;
    const resolvedPriority = (() => {
      const p = (defaults as any)?.priority;
      return p === 1 || p === 2 || p === 3 ? p : undefined;
    })() as any;
    const resolvedType = typeof (defaults as any)?.type === 'string' ? ((defaults as any).type as any) : 'task';
    const resolvedTags = Array.isArray((defaults as any)?.tags)
      ? (defaults as any).tags.filter((t: any) => typeof t === 'string' && t.trim().length > 0)
      : [];
    const resolvedDifficulty = typeof (defaults as any)?.difficulty === 'string' ? ((defaults as any).difficulty as any) : undefined;

    const resolvedReminderAt =
      reminderAt ?? (typeof defaults.reminderAt === 'string' ? defaults.reminderAt : null) ?? null;
    const resolvedReminderSource =
      reminderSource ??
      (reminderAt ? 'manual' : undefined) ??
      defaults.reminderSource;

    const activity: Activity = {
      id,
      goalId: resolvedGoalId,
      title: trimmed,
      type: resolvedType,
      tags: resolvedTags,
      notes: undefined,
      steps: [],
      reminderAt: resolvedReminderAt,
      reminderSource: resolvedReminderSource,
      priority: resolvedPriority,
      estimateMinutes:
        estimateMinutes ??
        (typeof (defaults as any).estimateMinutes === 'number' ? (defaults as any).estimateMinutes : null),
      difficulty: resolvedDifficulty,
      creationSource: 'manual',
      planGroupId: null,
      scheduledDate: scheduledDate ?? (typeof defaults.scheduledDate === 'string' ? defaults.scheduledDate : null) ?? null,
      repeatRule,
      repeatCustom: undefined,
      orderIndex: nextOrderIndex,
      phase: null,
      status: resolvedStatus,
      actualMinutes: null,
      startedAt: null,
      completedAt: null,
      forceActual: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    } as any;

    // Note: Creating activities no longer counts as "showing up" for streaks.
    // Streaks require completing activities/focus sessions.
    addActivity(activity);

    onCreated?.(activity);

    showToast({
      message: 'To-do created',
      variant: 'success',
      durationMs: 2200,
      bottomOffset: toastBottomOffset,
    });
    void HapticsService.trigger('outcome.success');

    setValue('');
    setReminderAt(null);
    setReminderSource(undefined);
    setScheduledDate(null);
    setRepeatRule(undefined);
    setEstimateMinutes(null);

    if (focusAfterSubmit) {
      requestAnimationFrame(() => {
        // Keep the keyboard up for rapid entry.
        inputRef.current?.focus?.();
      });
    }

    if (shouldRunAiActions && updateActivity) {
      markSharedActivityEnrichment(activity.id, true);
      markActivityEnrichment?.(activity.id, true);
      const applyEnrichment = (enrichment: any, currentLocation?: { latitude: number; longitude: number } | null) => {
        const ts = new Date().toISOString();
        const resolvedEnrichment = resolveQuickAddLocationTriggerEnrichment({
          enrichment,
          currentLocation,
          locationTriggersEnabled,
        });
        if (resolvedEnrichment.recommendation) {
          onLocationTriggerRecommended?.({
            activityId: activity.id,
            location: resolvedEnrichment.recommendation,
          });
        }
        updateActivity(activity.id, (prev) => {
          return applyQuickAddAiEnrichment(prev, resolvedEnrichment.enrichment, {
            activityId: activity.id,
            selectedActions: aiActions,
            timestamp: ts,
            goalContext,
          });
        });
      };
      const applyCoverImage = (selection: QuickAddCoverImageSelection | null | undefined) => {
        if (!selection?.thumbnailUrl && !selection?.heroImageMeta) return;
        const ts = new Date().toISOString();
        updateActivity(activity.id, (prev) => ({
          ...prev,
          thumbnailUrl: selection.thumbnailUrl,
          heroImageMeta: selection.heroImageMeta,
          updatedAt: ts,
        }));
      };
      const currentLocationPromise = enrichmentActions.includes('triggers') && locationTriggersEnabled
        ? getCurrentLocationBestEffort().catch(() => null)
        : Promise.resolve(null);
      const enrichmentPromise =
        shouldEnrichWithAI && enrichActivityWithAI
          ? enrichActivityWithAI({
              activityId: activity.id,
              title: trimmed,
              goalId: goalId ?? null,
              activityType: resolvedType,
              existingTags: resolvedTags,
              selectedActions: enrichmentActions,
            })
          : Promise.resolve(null);
      const coverImagePromise =
        shouldFindCoverImage && findCoverImageWithAI
          ? findCoverImageWithAI({
              activityId: activity.id,
              title: trimmed,
              goalId: goalId ?? null,
              activityType: resolvedType,
              existingTags: resolvedTags,
            })
          : Promise.resolve(null);
      Promise.allSettled([enrichmentPromise, coverImagePromise])
        .then(async (enrichment) => {
          const enrichmentResult = enrichment[0];
          const coverResult = enrichment[1];
          const enrichmentValue =
            enrichmentResult.status === 'fulfilled' ? enrichmentResult.value : null;
          if (enrichmentValue || enrichmentActions.includes('triggers')) {
            const currentLocation = await currentLocationPromise;
            applyEnrichment(enrichmentValue ?? {}, currentLocation);
          }
          if (coverResult.status === 'fulfilled') {
            applyCoverImage(coverResult.value);
          }
        })
        .catch(async () => {
          if (!enrichmentActions.includes('triggers')) return;
          const currentLocation = await currentLocationPromise;
          applyEnrichment({}, currentLocation);
        })
        .finally(() => {
          markSharedActivityEnrichment(activity.id, false);
          markActivityEnrichment?.(activity.id, false);
        });
    }
  }, [
    activitiesCount,
    addActivity,
    estimateMinutes,
    getActivityDefaults,
    getNextOrderIndex,
    goalId,
    goals,
    enrichActivityWithAI,
    findCoverImageWithAI,
    locationTriggersEnabled,
    markActivityEnrichment,
    markSharedActivityEnrichment,
    onLocationTriggerRecommended,
    tryConsumeGenerativeCredit,
    aiCreditTier,
    onAiCreditsExhausted,
    onCreated,
    recordShowUp,
    reminderAt,
    reminderSource,
    repeatRule,
    scheduledDate,
    showToast,
    toastBottomOffset,
    updateActivity,
    value,
    focusAfterSubmit,
  ]);

  return {
    value,
    setValue,
    inputRef,
    isFocused,
    setIsFocused,
    reservedHeight,
    setReservedHeight,
    reminderAt,
    reminderSource,
    setReminderAt,
    setReminderSource,
    scheduledDate,
    setScheduledDate,
    repeatRule,
    setRepeatRule,
    estimateMinutes,
    setEstimateMinutes,
    toastBottomOffset,
    collapse,
    openToolDrawer,
    closeToolDrawer,
    submit,
  };
}

export function consumeQuickAddAiActionCredits(
  selectedActions: QuickAddAiAction[],
  options: {
    tier: 'free' | 'pro';
    tryConsumeGenerativeCredit?: ConsumeGenerativeCredit;
  },
): boolean {
  const actionCount = selectedActions.length;
  if (actionCount <= 0 || !options.tryConsumeGenerativeCredit) return true;
  return options.tryConsumeGenerativeCredit({
    tier: options.tier,
    amount: actionCount,
  }).ok;
}

export function applyQuickAddAiEnrichment(
  activity: Activity,
  enrichment: any,
  options: {
    activityId: string;
    selectedActions: QuickAddAiAction[];
    timestamp: string;
    goalContext?: QuickAddGoalContext | null;
  },
): Activity {
  const selectedActions = new Set(options.selectedActions);
  if (selectedActions.size === 0) return activity;

  const updates: Partial<Activity> = { updatedAt: options.timestamp };

  if (selectedActions.has('details')) {
    if (enrichment.notes && !activity.notes) updates.notes = enrichment.notes;
    if (enrichment.tags && enrichment.tags.length > 0 && (!activity.tags || activity.tags.length === 0)) {
      updates.tags = enrichment.tags;
    }
    if (enrichment.goalId && !activity.goalId) {
      updates.goalId = enrichment.goalId;
    }
    if (enrichment.areaId && !activity.areaId) {
      updates.areaId = enrichment.areaId;
    }
    if (enrichment.type && activity.type === 'task' && enrichment.type !== 'task') {
      updates.type = enrichment.type;
    }
    if (enrichment.estimateMinutes != null && activity.estimateMinutes == null) {
      updates.estimateMinutes = enrichment.estimateMinutes;
    }
    if (enrichment.difficulty && !activity.difficulty) {
      updates.difficulty = enrichment.difficulty;
    }
  }

  if (selectedActions.has('steps')) {
    if (enrichment.steps && enrichment.steps.length > 0 && (!activity.steps || activity.steps.length === 0)) {
      updates.steps = enrichment.steps.map((step: any, idx: number) => ({
        id: `step-${options.activityId}-${idx}`,
        title: step.title,
        orderIndex: idx,
        completedAt: null,
      }));
    }
  }

  if (selectedActions.has('triggers')) {
    const triggerDefaults = inferQuickAddTriggerDefaults(
      activity,
      enrichment,
      options.timestamp,
      options.goalContext ?? null,
    );
    if (!activity.reminderAt) {
      updates.reminderAt = triggerDefaults.reminderAt;
    }
    if (!activity.scheduledDate) {
      updates.scheduledDate = triggerDefaults.scheduledDate;
    }
    if (!activity.repeatRule) {
      updates.repeatRule = triggerDefaults.repeatRule;
    }
    const location = normalizeTriggerLocation(enrichment?.location);
    if (!activity.location && location) {
      updates.location = location;
    }
  }

  return { ...activity, ...updates };
}

export function inferQuickAddTriggerDefaults(
  activity: Pick<Activity, 'title'>,
  enrichment: any,
  nowIso: string,
  goalContext?: QuickAddGoalContext | null,
): {
  reminderAt: string;
  scheduledDate: string;
  repeatRule?: ActivityRepeatRule;
} {
  const now = coerceValidDate(nowIso) ?? new Date();
  const goalTargetDate = coerceValidDate(goalContext?.targetDate);
  const inferredReminderAt =
    coerceFutureDate(enrichment?.reminderAt, now) ??
    inferReminderDate(activity.title, now, goalTargetDate);
  const scheduledDate =
    normalizeScheduledDate(enrichment?.scheduledDate) ??
    inferScheduledDate(inferredReminderAt, goalTargetDate, now);
  const repeatRule = inferTriggerRepeatRule(enrichment, activity.title, goalTargetDate, now);

  return {
    reminderAt: inferredReminderAt.toISOString(),
    scheduledDate,
    ...(repeatRule ? { repeatRule } : {}),
  };
}

function coerceValidDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function coerceFutureDate(raw: unknown, now: Date): Date | null {
  const date = coerceValidDate(raw);
  if (!date || date.getTime() <= now.getTime()) return null;
  return date;
}

function normalizeScheduledDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const date = coerceValidDate(trimmed);
  return date ? toLocalDateKey(date) : null;
}

function normalizeRepeatRule(raw: unknown): ActivityRepeatRule | null {
  return VALID_REPEAT_RULES.includes(raw as ActivityRepeatRule) ? (raw as ActivityRepeatRule) : null;
}

function inferTriggerRepeatRule(
  enrichment: any,
  title: string,
  goalTargetDate?: Date | null,
  now?: Date,
): ActivityRepeatRule | undefined {
  const normalized = normalizeRepeatRule(enrichment?.repeatRule);
  if (normalized) return normalized;
  if (enrichment && 'repeatRule' in enrichment && enrichment.repeatRule === null) return undefined;
  return inferRepeatRule(title, goalTargetDate, now);
}

function inferReminderDate(title: string, now: Date, goalTargetDate?: Date | null): Date {
  const lower = title.toLowerCase();
  const timeOfDay = inferTimeOfDay(lower, now);
  const baseDay = inferBaseReminderDay(lower, now);
  const candidate = atLocalTime(baseDay, timeOfDay.hour, timeOfDay.minute);
  const goalUrgency = getGoalUrgency(goalTargetDate, now);

  if (goalUrgency === 'due_now') {
    return addMinutes(now, 60);
  }

  if (candidate.getTime() > now.getTime()) {
    return clampToGoalTargetDay(candidate, goalTargetDate, now);
  }
  const tomorrow = addLocalDays(now, 1);
  return clampToGoalTargetDay(atLocalTime(tomorrow, timeOfDay.hour, timeOfDay.minute), goalTargetDate, now);
}

function inferBaseReminderDay(lowerTitle: string, now: Date): Date {
  if (/\b(today|tonight|later today|this evening|this afternoon|this morning)\b/.test(lowerTitle)) {
    return now;
  }
  if (/\b(tomorrow|tmrw|tom)\b/.test(lowerTitle)) {
    return addLocalDays(now, 1);
  }
  if (/\b(next week|in a week|this week)\b/.test(lowerTitle)) {
    return addLocalDays(now, 7);
  }
  const weekday = inferWeekday(lowerTitle);
  if (weekday !== null) {
    return nextWeekday(now, weekday);
  }
  return addLocalDays(now, 1);
}

function inferTimeOfDay(lowerTitle: string, now: Date): { hour: number; minute: number } {
  if (/\b(morning|am|a\.m\.)\b/.test(lowerTitle)) return { hour: 9, minute: 0 };
  if (/\b(afternoon|lunch|noon)\b/.test(lowerTitle)) return { hour: 12, minute: 0 };
  if (/\b(evening|tonight|night|pm|p\.m\.)\b/.test(lowerTitle)) return { hour: 19, minute: 0 };
  return { hour: now.getHours(), minute: nearestFiveMinutes(now.getMinutes()) };
}

function nearestFiveMinutes(minute: number): number {
  return Math.max(0, Math.min(55, Math.round(minute / 5) * 5));
}

function inferRepeatRule(title: string, goalTargetDate?: Date | null, now?: Date): ActivityRepeatRule | undefined {
  const lower = title.toLowerCase();
  if (/\b(cancel|remove|delete|close|stop|unsubscribe|terminate|end)\b/.test(lower)) return undefined;
  if (/\b(weekdays|workdays|business days|every weekday|each weekday)\b/.test(lower)) return 'weekdays';
  if (/\b(daily|every day|each day|every morning|each morning|every night|each night)\b/.test(lower)) {
    return 'daily';
  }
  if (/\b(weekly|every week|each week|routine|ritual)\b/.test(lower)) return 'weekly';
  if (/\b(monthly|every month|each month)\b/.test(lower)) return 'monthly';
  if (/\b(yearly|annually|every year|each year|annual)\b/.test(lower)) return 'yearly';
  const goalUrgency = getGoalUrgency(goalTargetDate, now);
  if (goalUrgency === 'soon' || goalUrgency === 'due_now') return 'daily';
  if (
    /\b(check|review|practice|train|work out|exercise|journal|meditate|stretch|read|study|water|take|walk|clean|tidy)\b/.test(
      lower,
    )
  ) {
    return 'weekly';
  }
  return undefined;
}

function inferScheduledDate(reminderAt: Date, goalTargetDate: Date | null, now: Date): string {
  const goalUrgency = getGoalUrgency(goalTargetDate, now);
  if (goalUrgency === 'due_now') return toLocalDateKey(now);
  if (goalTargetDate && reminderAt.getTime() > endOfLocalDay(goalTargetDate).getTime()) {
    return toLocalDateKey(goalTargetDate);
  }
  return toLocalDateKey(reminderAt);
}

function getGoalUrgency(goalTargetDate?: Date | null, now?: Date): 'none' | 'soon' | 'due_now' {
  if (!goalTargetDate || !now || !Number.isFinite(goalTargetDate.getTime())) return 'none';
  const todayStart = startOfLocalDay(now);
  const targetStart = startOfLocalDay(goalTargetDate);
  const daysUntil = Math.round((targetStart.getTime() - todayStart.getTime()) / 86_400_000);
  if (daysUntil <= 0) return 'due_now';
  if (daysUntil <= 7) return 'soon';
  return 'none';
}

function clampToGoalTargetDay(candidate: Date, goalTargetDate: Date | null | undefined, now: Date): Date {
  if (!goalTargetDate || !Number.isFinite(goalTargetDate.getTime())) return candidate;
  const targetEnd = endOfLocalDay(goalTargetDate);
  if (candidate.getTime() <= targetEnd.getTime()) return candidate;
  const sameTimeOnTarget = atLocalTime(goalTargetDate, candidate.getHours(), candidate.getMinutes());
  if (sameTimeOnTarget.getTime() > now.getTime()) return sameTimeOnTarget;
  return addMinutes(now, 60);
}

function inferWeekday(lowerTitle: string): number | null {
  const weekdays = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const index = weekdays.findIndex((day) => new RegExp(`\\b${day}\\b`).test(lowerTitle));
  return index >= 0 ? index : null;
}

function nextWeekday(now: Date, weekday: number): Date {
  const delta = (weekday - now.getDay() + 7) % 7 || 7;
  return addLocalDays(now, delta);
}

function addLocalDays(date: Date, deltaDays: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + deltaDays);
  return d;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function atLocalTime(date: Date, hour: number, minute: number): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function normalizeTriggerLocation(raw: unknown): NonNullable<Activity['location']> | null {
  if (!raw || typeof raw !== 'object') return null;
  const loc = raw as Record<string, unknown>;
  const latitude = Number(loc.latitude);
  const longitude = Number(loc.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const trigger = loc.trigger === 'arrive' || loc.trigger === 'leave' ? loc.trigger : 'leave';
  const radiusRaw = Number(loc.radiusM);
  const radiusM = Number.isFinite(radiusRaw)
    ? Math.max(15, Math.min(5000, Math.round(radiusRaw)))
    : DEFAULT_LOCATION_TRIGGER_RADIUS_M;
  const label =
    typeof loc.label === 'string' && loc.label.trim().length > 0
      ? loc.label.trim()
      : 'Current location';
  return {
    label,
    latitude,
    longitude,
    trigger,
    radiusM,
  };
}
