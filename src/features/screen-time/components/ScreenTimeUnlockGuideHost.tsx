import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import * as Crypto from 'expo-crypto';
import { getHouseholdSnapshot, type HouseholdSnapshot } from '../../household/data/household';
import {
  fetchFamilyScreenTimeSnapshot,
  projectFamilyScreenTimeRule,
  type FamilyScreenTimeSnapshot,
} from '../../household/screenTime/data/familyScreenTime';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { useAppStore } from '../../../store/useAppStore';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { projectScreenTimeGuideActions, type ScreenTimeActor } from '../domain/screenTimeGuideActions';
import { projectRulesForScreenTimeHandoff } from '../domain/screenTimeHandoffProjection';
import { routeForScreenTimeGuideManagement } from '../domain/screenTimeGuideManagement';
import { resolveScreenTimeActor } from '../domain/screenTimeHouseholdAuthority';
import type { ScreenTimeRule } from '../domain/screenTimeRule';
import { useScreenTimeHandoffStore } from '../runtime/screenTimeHandoffStore';
import { ScreenTimeUnlockGuide } from './ScreenTimeUnlockGuide';
import {
  requestWorkflowFeedback,
  type WorkflowFeedbackHandle,
} from '../../workflow-feedback';

type LoadedContext = {
  handoff: NonNullable<ReturnType<typeof useScreenTimeHandoffStore.getState>['pending']>;
  actor: ScreenTimeActor;
  household: HouseholdSnapshot | null;
  familySnapshots: FamilyScreenTimeSnapshot[];
};

function childMembershipIdsForActor(snapshot: HouseholdSnapshot, actor: ScreenTimeActor): string[] {
  if (actor.kind === 'household_child') return [actor.membershipId];
  if (actor.kind === 'household_caregiver') return actor.childMembershipIds;
  if (actor.kind === 'household_owner') {
    return snapshot.members.filter((member) => member.role === 'child').map((member) => member.id);
  }
  return [];
}

export function ScreenTimeUnlockGuideHost() {
  const { capture } = useAnalytics();
  const handoff = useScreenTimeHandoffStore((state) => state.pending);
  const visible = useScreenTimeHandoffStore((state) => state.visible);
  const dismiss = useScreenTimeHandoffStore((state) => state.dismiss);
  const personalSettings = useAppStore((state) => state.screenTimeProtection);
  const [context, setContext] = useState<LoadedContext | null>(null);
  const [feedbackSourceKey, setFeedbackSourceKey] = useState<string | null>(null);
  const feedbackHandlesRef = useRef<WorkflowFeedbackHandle[]>([]);

  const cancelFeedbackRequests = useCallback(() => {
    feedbackHandlesRef.current.forEach((handle) => handle.cancel());
    feedbackHandlesRef.current = [];
  }, []);

  useEffect(() => {
    if (!visible || !handoff) return;
    let cancelled = false;
    const episodeKey = `screen-time-guide-${Crypto.randomUUID()}`;
    cancelFeedbackRequests();
    setFeedbackSourceKey(episodeKey);
    setContext(null);
    void (async () => {
      let household: HouseholdSnapshot | null = null;
      let familySnapshots: FamilyScreenTimeSnapshot[] = [];
      try {
        const client = getSupabaseClient();
        household = await getHouseholdSnapshot(client);
        const actor = resolveScreenTimeActor(household);
        const childIds = childMembershipIdsForActor(household, actor);
        familySnapshots = (await Promise.all(childIds.map(async (childId) => {
          try { return await fetchFamilyScreenTimeSnapshot(client, childId); } catch { return null; }
        }))).filter((snapshot): snapshot is FamilyScreenTimeSnapshot => snapshot !== null);
      } catch {
        household = null;
      }
      if (cancelled) return;
      setContext({ handoff, actor: resolveScreenTimeActor(household), household, familySnapshots });
      capture(AnalyticsEvent.ScreenTimeGuideShown, {
        rule_count: handoff.restrictions.length,
        has_family_rule: handoff.restrictions.some((restriction) => restriction.reason === 'family_prerequisite'),
      });
      feedbackHandlesRef.current.push(requestWorkflowFeedback({
        promptId: 'screen_time_block_reason_clarity_v1',
        sourceKey: episodeKey,
        placement: 'inline',
      }));
    })();
    return () => {
      cancelled = true;
      cancelFeedbackRequests();
      setFeedbackSourceKey(null);
    };
  }, [cancelFeedbackRequests, capture, handoff, visible]);

  const familyRules = useMemo(() => (context?.familySnapshots ?? []).flatMap((snapshot) => (
    snapshot.agreements.flatMap((agreement) => {
      const rule = projectFamilyScreenTimeRule({ snapshot, agreement });
      return rule ? [rule] : [];
    })
  )), [context?.familySnapshots]);

  const projection = useMemo(() => {
    if (!handoff) return { rules: [] as ScreenTimeRule[], unresolvedRestrictions: [] };
    return projectRulesForScreenTimeHandoff({ handoff, personalSettings, familyRules });
  }, [familyRules, handoff, personalSettings]);
  const actor: ScreenTimeActor = context?.actor ?? { kind: 'household_member' };
  const actions = useMemo(() => projectScreenTimeGuideActions({
    actor,
    activeRules: projection.rules,
    unresolvedCount: projection.unresolvedRestrictions.length,
  }), [actor, projection.rules, projection.unresolvedRestrictions.length]);

  const handleDismiss = useCallback(() => {
    capture(AnalyticsEvent.ScreenTimeGuideDismissed, { rule_count: projection.rules.length });
    cancelFeedbackRequests();
    dismiss();
  }, [cancelFeedbackRequests, capture, dismiss, projection.rules.length]);

  const handleOpenRequirement = useCallback(() => {
    const destination = actions.requirementAction?.destination;
    if (!destination) return;
    capture(AnalyticsEvent.ScreenTimeGuideRequirementOpened, {
      resolution_kind: actions.resolutionKind,
      action_kind: actions.requirementAction?.kind,
    });
    cancelFeedbackRequests();
    dismiss();
    void Linking.openURL(destination);
  }, [actions.requirementAction, actions.resolutionKind, cancelFeedbackRequests, capture, dismiss]);

  const handleManageRules = useCallback(() => {
    if (!actions.canManageRules) return;
    const destination = routeForScreenTimeGuideManagement({
      rules: projection.rules,
      unresolvedCount: projection.unresolvedRestrictions.length,
      household: context?.household ?? null,
    });
    capture(AnalyticsEvent.ScreenTimeGuideManageRulesOpened, {
      resolution_kind: actions.resolutionKind,
      destination_class: destination.includes('/household/') ? 'family' : 'overview',
    });
    cancelFeedbackRequests();
    dismiss();
    void Linking.openURL(destination);
  }, [
    actions.canManageRules,
    actions.resolutionKind,
    cancelFeedbackRequests,
    capture,
    context?.household,
    dismiss,
    projection.rules,
    projection.unresolvedRestrictions.length,
  ]);

  if (!handoff) return null;
  return <ScreenTimeUnlockGuide
    // Resolve this handoff's authority before measuring/animating the card.
    // Otherwise the management action arrives mid-entrance and raises it again.
    visible={visible && context?.handoff === handoff}
    rules={projection.rules}
    unresolvedCount={projection.unresolvedRestrictions.length}
    actions={actions}
    feedbackSourceKey={feedbackSourceKey ?? undefined}
    onDismiss={handleDismiss}
    onOpenRequirement={handleOpenRequirement}
    onManageRules={handleManageRules}
  />;
}
