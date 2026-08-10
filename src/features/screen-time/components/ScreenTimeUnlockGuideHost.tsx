import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { loadMoneyAppControlSettings, saveMoneyAppControlSettings } from '../../../capabilities/money/runtime/moneyAppControlStorage';
import { getHouseholdSnapshot, type HouseholdSnapshot } from '../../household/data/household';
import {
  fetchFamilyScreenTimeSnapshot,
  projectFamilyScreenTimeRule,
  type FamilyScreenTimeSnapshot,
} from '../../household/screenTime/data/familyScreenTime';
import { applyTemporaryFamilyScreenTimeAccess } from '../../household/screenTime/familyScreenTimeCommands';
import {
  applyScreenTimeRestrictions,
  clearScreenTimeRestrictionsForSelection,
} from '../../../services/appleEcosystem/screenTimeProtection';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { routeForScreenTimeShieldReason } from '../../../services/screenTimeShieldHandoff';
import type { ScreenTimeRestrictionReason } from '../../../services/screenTimeProtection';
import { useAppStore } from '../../../store/useAppStore';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { projectScreenTimeGuideActions, type ScreenTimeActor } from '../domain/screenTimeGuideActions';
import { projectRulesForScreenTimeHandoff } from '../domain/screenTimeHandoffProjection';
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

const LOCAL_REASONS = new Set<ScreenTimeRestrictionReason>([
  'focus_session_active', 'meaningful_first_locked', 'meaningful_first_bypass',
  'money_review_required', 'money_over_limit', 'money_ahead_of_pace',
  'money_usage_threshold', 'money_transactions_need_review',
]);

function isLocalRestrictionReason(reason: string): reason is ScreenTimeRestrictionReason {
  return LOCAL_REASONS.has(reason as ScreenTimeRestrictionReason);
}

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
  const [moneySettings, setMoneySettings] = useState<Awaited<ReturnType<typeof loadMoneyAppControlSettings>> | null>(null);
  const [context, setContext] = useState<LoadedContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TemporaryOpenResult | null>(null);

  useEffect(() => {
    if (!visible || !handoff) return;
    let cancelled = false;
    setContext(null);
    setResult(null);
    void (async () => {
      const money = await loadMoneyAppControlSettings();
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
      setMoneySettings(money);
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
    if (!handoff || !moneySettings) return { rules: [] as ScreenTimeRule[], unresolvedRestrictions: handoff?.restrictions ?? [] };
    return projectRulesForScreenTimeHandoff({ handoff, personalSettings, moneySettings, familyRules });
  }, [familyRules, handoff, moneySettings, personalSettings]);
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
    void Linking.openURL(routeForScreenTimeShieldReason(leadReason));
  }, [capture, dismiss, handoff]);

  const handleOpenTemporarily = useCallback(async () => {
    if (!handoff || !moneySettings || !context || busy) return;
    setBusy(true);
    capture(AnalyticsEvent.ScreenTimeTemporaryOpenRequested, {
      rule_count: projection.rules.length,
      duration_minutes: 20,
    });
    const byId = new Map(projection.rules.map((rule) => [rule.id, rule]));
    const next = await openScreenTimeRulesTemporarily({
      actor: context.actor,
      rules: projection.rules,
      personalSettings,
      moneySettings,
      clearSelection: clearScreenTimeRestrictionsForSelection,
      savePersonalSettings: (settings) => setPersonalSettings(settings),
      saveMoneySettings: async (settings) => {
        const saved = await saveMoneyAppControlSettings(settings);
        setMoneySettings(saved);
      },
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
        await Promise.all(handoff.restrictions.map(async (restriction) => {
          const rule = byId.get(restriction.ruleId)
            ?? projection.rules.find((candidate) => candidate.selectionId === restriction.selectionId);
          if (!rule || rule.domain === 'family' || !isLocalRestrictionReason(restriction.reason)) return;
          if (rule.domain === 'personal') {
            const stored = personalSettings.personalRules.find((candidate) => candidate.id === rule.id);
            if (!stored) return;
            await applyScreenTimeRestrictions({
              settings: { selectedApps: stored.selectedApps, selectedCategories: stored.selectedCategories },
              reasons: [restriction.reason], selectionId: rule.selectionId, ruleId: rule.id,
              reason: restriction.reason, restrictionLabel: restriction.label ?? rule.title,
            });
            return;
          }
          if (rule.trigger.type !== 'money_review') return;
          const policy = moneySettings.policies[rule.trigger.categorySourceId];
          if (!policy) return;
          await applyScreenTimeRestrictions({
            settings: { selectedApps: policy.selectedApps, selectedCategories: policy.selectedCategories },
            reasons: [restriction.reason], selectionId: rule.selectionId, ruleId: rule.id,
            reason: restriction.reason, restrictionLabel: restriction.label ?? rule.title,
          });
        }));
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
  }, [busy, capture, context, handoff, moneySettings, personalSettings, projection.rules, setPersonalSettings]);

  if (!handoff) return null;
  return <ScreenTimeUnlockGuide
    visible={visible}
    rules={projection.rules}
    unresolvedCount={projection.unresolvedRestrictions.length}
    actions={actions}
    result={result}
    busy={busy || context === null || moneySettings === null}
    onDismiss={handleDismiss}
    onDoThisFirst={handleDoThisFirst}
    onOpenTemporarily={handleOpenTemporarily}
  />;
}
