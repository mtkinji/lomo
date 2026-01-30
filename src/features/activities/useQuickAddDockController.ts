import * as React from 'react';
import type { RefObject } from 'react';
import { Keyboard } from 'react-native';
import type { Activity } from '../../domain/types';
import type { ActivityRepeatRule } from '../../domain/types';
import { spacing } from '../../theme';
import { HapticsService } from '../../services/HapticsService';

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
  }) => Promise<any>;
  markActivityEnrichment?: (activityId: string, enriching: boolean) => void;
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
    addActivity,
    updateActivity,
    recordShowUp,
    showToast,
    initialReservedHeightPx,
    toastBottomOffsetOverridePx,
    onCreated,
    enrichActivityWithAI,
    markActivityEnrichment,
    focusAfterSubmit = true,
  } = params;

  const [value, setValue] = React.useState('');
  const inputRef = React.useRef<any>(null) as RefObject<any>;
  const [isFocused, setIsFocused] = React.useState(false);

  const [reminderAt, setReminderAt] = React.useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = React.useState<string | null>(null);
  const [repeatRule, setRepeatRule] = React.useState<ActivityRepeatRule | undefined>(undefined);
  const [estimateMinutes, setEstimateMinutes] = React.useState<number | null>(null);

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

  const submit = React.useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

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

    const activity: Activity = {
      id,
      goalId: resolvedGoalId,
      title: trimmed,
      type: resolvedType,
      tags: resolvedTags,
      notes: undefined,
      steps: [],
      reminderAt: reminderAt ?? (typeof defaults.reminderAt === 'string' ? defaults.reminderAt : null) ?? null,
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
      message: 'Activity created',
      variant: 'success',
      durationMs: 2200,
      bottomOffset: toastBottomOffset,
    });
    void HapticsService.trigger('outcome.success');

    setValue('');
    setReminderAt(null);
    setScheduledDate(null);
    setRepeatRule(undefined);
    setEstimateMinutes(null);

    if (focusAfterSubmit) {
      requestAnimationFrame(() => {
        // Keep the keyboard up for rapid entry.
        inputRef.current?.focus?.();
      });
    }

    if (enrichActivityWithAI && updateActivity) {
      markActivityEnrichment?.(activity.id, true);
      enrichActivityWithAI({
        activityId: activity.id,
        title: trimmed,
        goalId: goalId ?? null,
        activityType: resolvedType,
        existingTags: resolvedTags,
      })
        .then((enrichment) => {
          if (!enrichment) return;
          const ts = new Date().toISOString();
          updateActivity(activity.id, (prev) => {
            const updates: Partial<Activity> = { updatedAt: ts };
            if (enrichment.notes && !prev.notes) updates.notes = enrichment.notes;
            if (enrichment.tags && enrichment.tags.length > 0 && (!prev.tags || prev.tags.length === 0)) {
              updates.tags = enrichment.tags;
            }
            if (enrichment.steps && enrichment.steps.length > 0 && (!prev.steps || prev.steps.length === 0)) {
              updates.steps = enrichment.steps.map((step: any, idx: number) => ({
                id: `step-${activity.id}-${idx}`,
                title: step.title,
                orderIndex: idx,
                completedAt: null,
              }));
            }
            if (enrichment.estimateMinutes != null && prev.estimateMinutes == null) {
              updates.estimateMinutes = enrichment.estimateMinutes;
            }
            if (enrichment.priority != null && prev.priority == null) {
              updates.priority = enrichment.priority;
            }
            if (enrichment.difficulty) {
              updates.aiPlanning = {
                ...prev.aiPlanning,
                difficulty: enrichment.difficulty,
                estimateMinutes: enrichment.estimateMinutes ?? prev.aiPlanning?.estimateMinutes,
                confidence: 0.7,
                lastUpdatedAt: ts,
                source: 'quick_suggest' as const,
              };
            }
            return { ...prev, ...updates };
          });
        })
        .catch(() => undefined)
        .finally(() => {
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
    enrichActivityWithAI,
    markActivityEnrichment,
    onCreated,
    recordShowUp,
    reminderAt,
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
    setReminderAt,
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


