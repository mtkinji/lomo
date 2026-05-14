import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { AnalyticsEvent, type AnalyticsEventName } from './analytics/events';
import type { AnalyticsProps } from './analytics/analytics';
import { getCheckinAudienceForGoal, type CheckinTrigger } from './checkins';
import {
  makeDraftItem,
  shouldShowImmediatePrompt,
  type CheckinDraftItemSource,
} from './checkinDrafts';
import { shouldShowLowPriorityMomentNow } from './moments/orchestrator';
import { useCheckinDraftStore } from '../store/useCheckinDraftStore';
import { useCheckinNudgeStore } from '../store/useCheckinNudgeStore';

type CaptureFn = (event: AnalyticsEventName, props?: AnalyticsProps) => void;

export type QueueCheckinDraftFromProgressParams = {
  goalId: string;
  trigger: CheckinTrigger;
  source: string;
  sourceType: CheckinDraftItemSource;
  sourceId: string;
  title: string;
  completedAt?: string;
  durationMinutes?: number | null;
  openPromptDelayMs?: number;
  capture?: CaptureFn;
};

export type QueueCheckinDraftFromProgressResult =
  | { status: 'skipped'; reason: 'missing_title' | 'ineligible' | 'prompt_suppressed'; eligibilityReason?: string }
  | { status: 'created'; promptOpened: boolean; draftId: string }
  | { status: 'appended'; promptOpened: false; draftId: string; itemCount: number };

export async function queueCheckinDraftFromProgress(
  params: QueueCheckinDraftFromProgressParams,
): Promise<QueueCheckinDraftFromProgressResult> {
  const title = params.title.trim();
  if (!title) {
    return { status: 'skipped', reason: 'missing_title' };
  }

  const audience = await getCheckinAudienceForGoal(params.goalId);
  if (!audience.eligible) {
    if (audience.reason === 'no_partners') {
      useCheckinNudgeStore.getState().markFirstProgressAlone(params.goalId);
    }
    return {
      status: 'skipped',
      reason: 'ineligible',
      eligibilityReason: audience.reason,
    };
  }

  const store = useCheckinDraftStore.getState();
  const existing = store.getDraft(params.goalId);
  const draft = store.ensureDraft({
    goalId: params.goalId,
    partnerCircleKey: audience.partnerCircleKey,
    initialItem: makeDraftItem({
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      title,
      completedAt: params.completedAt ?? new Date().toISOString(),
      durationMinutes: params.durationMinutes ?? null,
    }),
  });

  if (!existing || existing.status !== 'active' || existing.items.length === 0) {
    params.capture?.(AnalyticsEvent.CheckinDraftCreated, {
      goalId: params.goalId,
      sourceType: params.sourceType,
      source: params.source,
    });

    const nudgeState = useCheckinNudgeStore.getState();
    const momentGate = shouldShowLowPriorityMomentNow('checkin_nudge');
    const canOpenPrompt =
      nudgeState.shouldShowNudge(params.goalId, params.trigger) &&
      momentGate.ok &&
      shouldShowImmediatePrompt(draft);

    if (!canOpenPrompt) {
      return { status: 'created', promptOpened: false, draftId: draft.id };
    }

    store.markPrompted(params.goalId);
    params.capture?.(AnalyticsEvent.CheckinDraftShown, {
      goalId: params.goalId,
      trigger: params.trigger,
      source: params.source,
    });

    const delayMs = params.openPromptDelayMs ?? 900;
    setTimeout(() => {
      rootNavigationRef.navigate('MainTabs', {
        screen: 'MoreTab',
        params: {
          screen: 'MoreArcs',
          params: {
            screen: 'GoalDetail',
            params: {
              goalId: params.goalId,
              entryPoint: 'activitiesStack',
              openCheckinApprovalSheet: true,
            },
          },
        },
      });
    }, delayMs);

    return { status: 'created', promptOpened: true, draftId: draft.id };
  }

  params.capture?.(AnalyticsEvent.CheckinDraftItemAppended, {
    goalId: params.goalId,
    sourceType: params.sourceType,
    itemCount: draft.items.length,
    source: params.source,
  });

  return {
    status: 'appended',
    promptOpened: false,
    draftId: draft.id,
    itemCount: draft.items.length,
  };
}
