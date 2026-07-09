import { Alert, type TextInput } from 'react-native';
import { useCallback, useMemo, useState, type RefObject } from 'react';
import { useActivityEnrichmentStore } from '../../store/useActivityEnrichmentStore';
import { useCanUseProTools } from '../../store/proToolsAccess';
import type { Activity, Arc, Goal } from '../../domain/types';
import type { BusyInterval } from '../../services/scheduling/schedulingEngine';
import type { DailyPlanProposal } from '../../services/plan/planScheduling';
import { enrichActivityWithAI } from '../../services/ai';
import { openPaywallInterstitial } from '../../services/paywall';
import { findActivityCoverImageWithAI } from '../activities/activityCoverImage';
import {
  useQuickAddDockController,
  type QuickAddAiAction,
} from '../activities/useQuickAddDockController';
import type { PlanSlotCaptureModel } from './PlanSlotCapturePage';
import type { PlanSlotDraft } from './planSlotDraft';

type ToastPayload = {
  message: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'credits' | 'light';
  durationMs?: number;
  bottomOffset?: number;
  behaviorDuringSuppression?: 'show' | 'queue' | 'drop';
  actionLabel?: string;
  onPressAction?: () => void;
};

type ConsumeGenerativeCredit = (params: {
  tier: 'free' | 'pro';
  amount?: number;
}) => { ok: boolean; remaining: number; limit: number };

type CommitProposal = (activityId: string, proposal: DailyPlanProposal) => Promise<boolean>;

export function usePlanSlotCapture(params: {
  slotDraft: PlanSlotDraft | null;
  activities: Activity[];
  goals: Goal[];
  arcs: Arc[];
  dateKey: string;
  busyIntervals: BusyInterval[];
  scheduleProposals: DailyPlanProposal[];
  writeCalendarId: string | null;
  getPlanModeForActivity: (activity: Activity) => 'work' | 'personal';
  isWithinWindows: (mode: 'work' | 'personal', start: Date, end: Date) => boolean;
  quickAddAiActions: QuickAddAiAction[];
  setQuickAddAiActions: (actions: QuickAddAiAction[]) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (activityId: string, updater: (prev: Activity) => Activity) => void;
  recordShowUp: () => void;
  tryConsumeGenerativeCredit?: ConsumeGenerativeCredit;
  showToast: (payload: ToastPayload) => void;
  commitProposal: CommitProposal;
  clearSlotDraft: () => void;
}): PlanSlotCaptureModel | null {
  const {
    slotDraft,
    activities,
    goals,
    arcs,
    dateKey,
    busyIntervals,
    scheduleProposals,
    writeCalendarId,
    getPlanModeForActivity,
    isWithinWindows,
    quickAddAiActions,
    setQuickAddAiActions,
    addActivity,
    updateActivity,
    recordShowUp,
    tryConsumeGenerativeCredit,
    showToast,
    commitProposal,
    clearSlotDraft,
  } = params;
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null);
  const [committingActivityId, setCommittingActivityId] = useState<string | null>(null);
  const isPro = useCanUseProTools();
  const canUseUnsplash = useCanUseProTools('unsplash_banners');

  const selectedAiActions = useMemo(
    () => (
      canUseUnsplash
        ? quickAddAiActions
        : quickAddAiActions.filter((action) => action !== 'cover_image')
    ),
    [canUseUnsplash, quickAddAiActions],
  );

  const durationMinutes = useMemo(() => {
    if (!slotDraft) return 30;
    return Math.max(15, Math.round((slotDraft.end.getTime() - slotDraft.start.getTime()) / 60000));
  }, [slotDraft]);

  const scheduledProposalIds = useMemo(
    () => new Set(scheduleProposals.map((proposal) => proposal.activityId)),
    [scheduleProposals],
  );

  const existingActivities = useMemo(
    () =>
      activities
        .filter((activity) => {
          if (activity.status === 'done' || activity.status === 'cancelled') return false;
          if (activity.scheduledAt) return false;
          if (!activity.title.trim()) return false;
          if (scheduledProposalIds.has(activity.id)) return false;
          return true;
        })
        .sort((a, b) => {
          const ao = typeof a.orderIndex === 'number' ? a.orderIndex : Number.MAX_SAFE_INTEGER;
          const bo = typeof b.orderIndex === 'number' ? b.orderIndex : Number.MAX_SAFE_INTEGER;
          return ao - bo;
        })
        .slice(0, 12)
        .map((activity) => ({
          activityId: activity.id,
          title: activity.title,
          estimateMinutes: activity.estimateMinutes ?? null,
        })),
    [activities, scheduledProposalIds],
  );

  const getNextOrderIndex = useCallback(() => {
    const orderIndexes = activities
      .map((activity) => activity.orderIndex)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return orderIndexes.length === 0 ? 0 : Math.min(...orderIndexes) - 1;
  }, [activities]);

  const findCoverImageWithAI = useCallback(
    (coverParams: {
      activityId: string;
      title: string;
      goalId: string | null;
      activityType?: string;
      existingTags?: string[];
    }) =>
      findActivityCoverImageWithAI({
        title: coverParams.title,
        goalId: coverParams.goalId,
        activityType: coverParams.activityType,
        existingTags: coverParams.existingTags,
        goals,
        arcs,
        canUseUnsplash,
      }),
    [arcs, canUseUnsplash, goals],
  );

  const markActivityEnrichment = useCallback((activityId: string, enriching: boolean) => {
    useActivityEnrichmentStore.getState().markActivityEnrichment(activityId, enriching);
  }, []);

  const onCreated = useCallback((activity: Activity) => {
    setCreatedActivityId(activity.id);
    setSelectedActivityId(activity.id);
  }, []);

  const controller = useQuickAddDockController({
    goalId: null,
    activitiesCount: activities.length,
    getNextOrderIndex,
    getActivityDefaults: () => ({
      estimateMinutes: durationMinutes,
      scheduledDate: dateKey,
    }),
    goals,
    addActivity,
    updateActivity,
    recordShowUp,
    showToast,
    initialReservedHeightPx: 0,
    toastBottomOffsetOverridePx: 96,
    onCreated,
    enrichActivityWithAI,
    findCoverImageWithAI,
    markActivityEnrichment,
    tryConsumeGenerativeCredit,
    aiCreditTier: isPro ? 'pro' : 'free',
    onAiCreditsExhausted: () => {
      openPaywallInterstitial({
        reason: 'generative_quota_exceeded',
        source: 'activity_quick_add_ai',
      });
    },
    focusAfterSubmit: false,
  });

  const handleLockedAiActionPress = useCallback((action: QuickAddAiAction) => {
    if (action !== 'cover_image') return;
    openPaywallInterstitial({
      reason: 'pro_only_unsplash_banners',
      source: 'activity_quick_add_ai',
    });
  }, []);

  const buildProposal = useCallback(
    (activity: Activity): DailyPlanProposal | null => {
      if (!slotDraft || !writeCalendarId) return null;
      return {
        activityId: activity.id,
        title: activity.title,
        startDate: slotDraft.start.toISOString(),
        endDate: slotDraft.end.toISOString(),
        calendarId: writeCalendarId,
        domain: getPlanModeForActivity(activity),
        goalId: activity.goalId ?? null,
      };
    },
    [getPlanModeForActivity, slotDraft, writeCalendarId],
  );

  const validateSlot = useCallback(
    (activity: Activity): DailyPlanProposal | null => {
      if (!slotDraft) return null;
      if (!writeCalendarId) {
        Alert.alert('Choose a calendar', 'Select a write calendar in Settings before committing.');
        return null;
      }
      const mode = getPlanModeForActivity(activity);
      if (!isWithinWindows(mode, slotDraft.start, slotDraft.end)) {
        Alert.alert('Outside availability', 'Pick a time within your availability windows.');
        return null;
      }
      const conflicts = busyIntervals.some((busy) => busy.start < slotDraft.end && slotDraft.start < busy.end);
      if (conflicts) {
        Alert.alert('Time conflict', 'That time conflicts with your calendar.');
        return null;
      }
      return buildProposal(activity);
    },
    [buildProposal, busyIntervals, getPlanModeForActivity, isWithinWindows, slotDraft, writeCalendarId],
  );

  const commitActivity = useCallback(
    async (activityId: string | null) => {
      if (!activityId) return;
      const activity = activities.find((candidate) => candidate.id === activityId) ?? null;
      if (!activity) return;
      const proposal = validateSlot(activity);
      if (!proposal) return;
      setCommittingActivityId(activity.id);
      const committed = await commitProposal(activity.id, proposal);
      setCommittingActivityId(null);
      if (committed) clearSlotDraft();
    },
    [activities, clearSlotDraft, commitProposal, validateSlot],
  );

  const handleSaveNewToTodos = useCallback(() => {
    if (controller.value.trim().length === 0) return;
    controller.submit({ aiActions: selectedAiActions });
    clearSlotDraft();
  }, [clearSlotDraft, controller, selectedAiActions]);

  if (!slotDraft) return null;

  return {
    start: slotDraft.start,
    end: slotDraft.end,
    quickAdd: {
      value: controller.value,
      onChangeText: controller.setValue,
      inputRef: controller.inputRef as RefObject<TextInput | null>,
      isFocused: controller.isFocused,
      setIsFocused: controller.setIsFocused,
      onSubmit: controller.submit,
      onCollapse: controller.collapse,
      selectedAiActions,
      onSelectedAiActionsChange: setQuickAddAiActions,
      lockedAiActions: canUseUnsplash ? undefined : { cover_image: 'Pro' },
      onLockedAiActionPress: handleLockedAiActionPress,
    },
    existingActivities,
    selectedActivityId,
    createdActivityId,
    committingActivityId,
    onSelectActivity: setSelectedActivityId,
    onCommitNew: () => commitActivity(createdActivityId),
    onCommitExisting: () => commitActivity(selectedActivityId),
    onSaveNewToTodos: handleSaveNewToTodos,
  };
}
