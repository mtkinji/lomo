import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { getHouseholdSnapshot, type HouseholdSnapshot } from '../../household/data/household';
import {
  fetchFamilyScreenTimeSnapshot,
  projectFamilyScreenTimeRule,
  type FamilyScreenTimeSnapshot,
} from '../../household/screenTime/data/familyScreenTime';
import { applyTemporaryFamilyScreenTimeAccess } from '../../household/screenTime/familyScreenTimeCommands';
import {
  clearPersonalCompositeScreenTimeRule,
  clearScreenTimeRestrictionsForSelection,
} from '../../../services/appleEcosystem/screenTimeProtection';
import { reconcileScreenTimeRestrictions } from '../../../services/screenTimeProtectionRuntime';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { useAppStore } from '../../../store/useAppStore';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { projectScreenTimeGuideActions, type ScreenTimeActor } from '../domain/screenTimeGuideActions';
import { projectRulesForScreenTimeHandoff, routeForScreenTimeRuleRequirement } from '../domain/screenTimeHandoffProjection';
import { resolveScreenTimeActor } from '../domain/screenTimeHouseholdAuthority';
import type { ScreenTimeRule } from '../domain/screenTimeRule';
import { useScreenTimeHandoffStore } from '../runtime/screenTimeHandoffStore';
import {
  openScreenTimeRulesTemporarily,
  type TemporaryOpenResult,
} from '../runtime/openScreenTimeRulesTemporarily';
import { ScreenTimeUnlockGuide } from './ScreenTimeUnlockGuide';

type LoadedContext = {
  actor: ScreenTimeActor;
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
  const setPersonalSettings = useAppStore((state) => state.setScreenTimeProtection);
  const [context, setContext] = useState<LoadedContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TemporaryOpenResult | null>(null);

  useEffect(() => {
    if (!visible || !handoff) return;
    let cancelled = false;
    setContext(null);
    setResult(null);
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
      setContext({ actor: resolveScreenTimeActor(household), familySnapshots });
      capture(AnalyticsEvent.ScreenTimeGuideShown, {
        rule_count: handoff.restrictions.length,
        has_family_rule: handoff.restrictions.some((restriction) => restriction.reason === 'family_prerequisite'),
      });
    })();
    return () => { cancelled = true; };
  }, [capture, handoff, visible]);

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
  }), [actor, projection.rules]);

  const handleDismiss = useCallback(() => {
    capture(AnalyticsEvent.ScreenTimeGuideDismissed, { rule_count: projection.rules.length });
    dismiss();
  }, [capture, dismiss, projection.rules.length]);

  const handleDoThisFirst = useCallback(() => {
    if (!handoff) return;
    const leadReason = handoff.restrictions[0]?.reason ?? handoff.reason;
    capture(AnalyticsEvent.ScreenTimeGuideRequirementOpened, { reason: leadReason ?? 'unknown' });
    dismiss();
    void Linking.openURL(routeForScreenTimeRuleRequirement({
      ruleId: actions.leadRuleId,
      reason: leadReason,
      personalSettings,
    }));
  }, [actions.leadRuleId, capture, dismiss, handoff, personalSettings]);

  const handleOpenTemporarily = useCallback(async () => {
    if (!handoff || !context || busy) return;
    setBusy(true);
    capture(AnalyticsEvent.ScreenTimeTemporaryOpenRequested, {
      rule_count: projection.rules.length,
      duration_minutes: 20,
    });
    const next = await openScreenTimeRulesTemporarily({
      actor: context.actor,
      rules: projection.rules,
      personalSettings,
      clearSelection: clearScreenTimeRestrictionsForSelection,
      clearComposite: clearPersonalCompositeScreenTimeRule,
      savePersonalSettings: (settings) => setPersonalSettings(settings),
      openFamilyRules: async (rules, expiresAtIso) => {
        const response = await applyTemporaryFamilyScreenTimeAccess(getSupabaseClient(), {
          action: 'allow',
          expiresAt: expiresAtIso,
          targets: rules.map((rule) => ({
            childMembershipId: rule.subject.kind === 'child' ? rule.subject.membershipId : '',
            selectionId: rule.selectionId,
            expectedVersion: rule.desiredVersion,
          })),
          operationId: `screen-time-guide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        });
        return response.targets.every((target) => target.deliveryState === 'applied') ? 'applied' : 'applying';
      },
      restoreRestrictions: async () => {
        await reconcileScreenTimeRestrictions({ focusSessionActive: false });
      },
    });
    setResult(next);
    const outcomeEvent = next.status === 'opened' || next.status === 'applying'
      ? AnalyticsEvent.ScreenTimeTemporaryOpenApplied
      : next.status === 'denied'
        ? AnalyticsEvent.ScreenTimeTemporaryOpenDenied
        : AnalyticsEvent.ScreenTimeTemporaryOpenFailed;
    capture(outcomeEvent, {
      outcome: next.status,
      rule_count: projection.rules.length,
      duration_minutes: 20,
    });
    setBusy(false);
  }, [busy, capture, context, handoff, personalSettings, projection.rules, setPersonalSettings]);

  if (!handoff) return null;
  return <ScreenTimeUnlockGuide
    visible={visible}
    rules={projection.rules}
    unresolvedCount={projection.unresolvedRestrictions.length}
    actions={actions}
    result={result}
    busy={busy || context === null}
    onDismiss={handleDismiss}
    onDoThisFirst={handleDoThisFirst}
    onOpenTemporarily={handleOpenTemporarily}
  />;
}
