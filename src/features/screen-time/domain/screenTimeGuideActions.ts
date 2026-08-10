import {
  DEFAULT_TEMPORARY_OPEN_MINUTES,
  type ScreenTimeRule,
} from './screenTimeRule';

export type ScreenTimeActor =
  | { kind: 'self_adult' }
  | { kind: 'household_owner' }
  | { kind: 'household_caregiver'; childMembershipIds: string[] }
  | { kind: 'household_child'; membershipId: string }
  | { kind: 'household_member' };

export type ScreenTimeGuideActions = {
  leadRuleId: string | null;
  canTemporarilyOpen: boolean;
  temporaryOpenMinutes: typeof DEFAULT_TEMPORARY_OPEN_MINUTES;
  temporaryOpenRuleIds: string[];
  requiresCaregiver: boolean;
};

function canActorOverride(rule: ScreenTimeRule, actor: ScreenTimeActor): boolean {
  if (!rule.active || !rule.temporaryOpen.allowed) return false;
  if (rule.subject.kind === 'self') {
    return actor.kind === 'self_adult'
      || actor.kind === 'household_owner'
      || actor.kind === 'household_caregiver';
  }
  if (actor.kind === 'household_owner') return true;
  return actor.kind === 'household_caregiver'
    && actor.childMembershipIds.includes(rule.subject.membershipId);
}

export function projectScreenTimeGuideActions(params: {
  actor: ScreenTimeActor;
  activeRules: ScreenTimeRule[];
}): ScreenTimeGuideActions {
  const activeRules = params.activeRules.filter((rule) => rule.active);
  const familySubjects = activeRules.flatMap((rule) => (
    rule.subject.kind === 'child' ? [rule.subject.membershipId] : []
  ));
  const hasMultipleFamilyClaimsForOneChild = new Set(familySubjects).size !== familySubjects.length;
  const canTemporarilyOpen = activeRules.length > 0
    && !hasMultipleFamilyClaimsForOneChild
    && activeRules.every((rule) => canActorOverride(rule, params.actor));
  const hasUnauthorizedFamilyRule = activeRules.some((rule) => (
    rule.domain === 'family' && !canActorOverride(rule, params.actor)
  ));

  return {
    leadRuleId: activeRules[0]?.id ?? null,
    canTemporarilyOpen,
    temporaryOpenMinutes: DEFAULT_TEMPORARY_OPEN_MINUTES,
    temporaryOpenRuleIds: canTemporarilyOpen ? activeRules.map((rule) => rule.id) : [],
    requiresCaregiver: hasUnauthorizedFamilyRule,
  };
}
