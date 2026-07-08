import { useCallback, useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { TextInput } from 'react-native';
import { useActivityEnrichmentStore } from '../../store/useActivityEnrichmentStore';
import { useCanUseProTools } from '../../store/proToolsAccess';
import type { Activity, ActivityArea, Arc, Goal, UserProfile } from '../../domain/types';
import type { BusyInterval } from '../../services/scheduling/schedulingEngine';
import { proposeSlotsForActivity, type DailyPlanProposal } from '../../services/plan/planScheduling';
import { enrichActivityWithAI } from '../../services/ai';
import { openPaywallInterstitial } from '../../services/paywall';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { findActivityCoverImageWithAI } from '../activities/activityCoverImage';
import {
  useQuickAddDockController,
  type QuickAddAiAction,
} from '../activities/useQuickAddDockController';

type ToastPayload = {
  message: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'credits' | 'light';
  durationMs?: number;
  bottomOffset?: number;
  behaviorDuringSuppression?: 'show' | 'queue' | 'drop';
  actionLabel?: string;
  onPressAction?: () => void;
};

type AddActivity = (activity: Activity) => void;
type UpdateActivity = (activityId: string, updater: (prev: Activity) => Activity) => void;
type ConsumeGenerativeCredit = (params: {
  tier: 'free' | 'pro';
  amount?: number;
}) => { ok: boolean; remaining: number; limit: number };

export type PlanRecommendationsQuickAddModel = {
  value: string;
  onChangeText: (text: string) => void;
  inputRef: RefObject<TextInput | null>;
  isFocused: boolean;
  setIsFocused: (next: boolean) => void;
  onSubmit: (options?: { aiActions?: QuickAddAiAction[] }) => void;
  onCollapse: () => void;
  selectedAiActions: QuickAddAiAction[];
  onSelectedAiActionsChange: (actions: QuickAddAiAction[]) => void;
  lockedAiActions?: Partial<Record<QuickAddAiAction, string>>;
  onLockedAiActionPress?: (action: QuickAddAiAction) => void;
};

export function usePlanRecommendationsQuickAdd(params: {
  activities: Activity[];
  goals: Goal[];
  arcs: Arc[];
  userProfile: UserProfile | null;
  targetDate: Date;
  dateKey: string;
  busyIntervals: BusyInterval[];
  scheduleProposals: DailyPlanProposal[];
  writeCalendarId: string | null;
  activityAreas: ActivityArea[];
  quickAddAiActions: QuickAddAiAction[];
  setQuickAddAiActions: (actions: QuickAddAiAction[]) => void;
  addActivity: AddActivity;
  updateActivity: UpdateActivity;
  recordShowUp: () => void;
  tryConsumeGenerativeCredit?: ConsumeGenerativeCredit;
  showToast: (payload: ToastPayload) => void;
  setSkippedIds: Dispatch<SetStateAction<Set<string>>>;
  setSheetCreatedProposals: Dispatch<SetStateAction<DailyPlanProposal[]>>;
  setSheetCreatedUnscheduledIds: Dispatch<SetStateAction<string[]>>;
  setSheetSnapIndex: (index: number) => void;
}) {
  const {
    activities,
    goals,
    arcs,
    userProfile,
    targetDate,
    dateKey,
    busyIntervals,
    scheduleProposals,
    writeCalendarId,
    activityAreas,
    quickAddAiActions,
    setQuickAddAiActions,
    addActivity,
    updateActivity,
    recordShowUp,
    tryConsumeGenerativeCredit,
    showToast,
    setSkippedIds,
    setSheetCreatedProposals,
    setSheetCreatedUnscheduledIds,
    setSheetSnapIndex,
  } = params;
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

  const onCreated = useCallback(
    (activity: Activity) => {
      setSkippedIds((prev) => {
        if (!prev.has(activity.id)) return prev;
        const next = new Set(prev);
        next.delete(activity.id);
        return next;
      });

      const proposedBusyIntervals = scheduleProposals.map((proposal) => ({
        start: new Date(proposal.startDate),
        end: new Date(proposal.endDate),
      }));
      const [slot] = proposeSlotsForActivity({
        activity,
        goals,
        userProfile,
        targetDate,
        busyIntervals: [...busyIntervals, ...proposedBusyIntervals],
        writeCalendarId,
        limit: 1,
        activityAreas,
      });

      if (slot) {
        setSheetCreatedUnscheduledIds((prev) => prev.filter((id) => id !== activity.id));
        setSheetCreatedProposals((prev) => [
          { ...slot, title: activity.title },
          ...prev.filter((proposal) => proposal.activityId !== activity.id),
        ]);
        return;
      }

      setSheetCreatedProposals((prev) => prev.filter((proposal) => proposal.activityId !== activity.id));
      setSheetCreatedUnscheduledIds((prev) => [
        activity.id,
        ...prev.filter((id) => id !== activity.id),
      ]);
    },
    [
      activityAreas,
      busyIntervals,
      goals,
      scheduleProposals,
      setSheetCreatedProposals,
      setSheetCreatedUnscheduledIds,
      setSkippedIds,
      targetDate,
      userProfile,
      writeCalendarId,
    ],
  );

  const controller = useQuickAddDockController({
    goalId: null,
    activitiesCount: activities.length,
    getNextOrderIndex,
    getActivityDefaults: () => ({
      estimateMinutes: 30,
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

  const handlePickTimeForCreated = useCallback(
    (activityId: string) => {
      setSheetSnapIndex(0);
      if (!rootNavigationRef.isReady()) return;
      rootNavigationRef.navigate('MainTabs', {
        screen: 'ActivitiesTab',
        params: { screen: 'ActivityDetail', params: { activityId, openSchedule: true } },
      } as never);
    },
    [setSheetSnapIndex],
  );

  const handleSaveCreatedWithoutScheduling = useCallback(
    (activityId: string) => {
      setSheetCreatedUnscheduledIds((prev) => prev.filter((id) => id !== activityId));
      showToast({ message: 'Saved to To-dos.', variant: 'light' });
    },
    [setSheetCreatedUnscheduledIds, showToast],
  );

  return {
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
    } satisfies PlanRecommendationsQuickAddModel,
    handlePickTimeForCreated,
    handleSaveCreatedWithoutScheduling,
  };
}
