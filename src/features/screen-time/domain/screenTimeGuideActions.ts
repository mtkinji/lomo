import type {
  ScreenTimeRule,
  ScreenTimeRuleRequirementAction,
} from './screenTimeRule';

export type ScreenTimeActor =
  | { kind: 'self_adult' }
  | { kind: 'household_owner' }
  | { kind: 'household_caregiver'; childMembershipIds: string[] }
  | { kind: 'household_child'; membershipId: string }
  | { kind: 'household_member' };

export type ScreenTimeGuideActions = {
  resolutionKind: 'actionable' | 'boundary' | 'mixed' | 'unresolved';
  requirementAction: ScreenTimeRuleRequirementAction | null;
  canManageRules: boolean;
  requiresCaregiver: boolean;
};

function canActorManage(rule: ScreenTimeRule, actor: ScreenTimeActor): boolean {
  if (rule.subject.kind === 'self') {
    return actor.kind === 'self_adult'
      || actor.kind === 'household_owner'
      || actor.kind === 'household_caregiver';
  }
  if (actor.kind === 'household_owner') return true;
  return actor.kind === 'household_caregiver'
    && actor.childMembershipIds.includes(rule.subject.membershipId);
}

function requirementActionForRule(
  rule: ScreenTimeRule,
): ScreenTimeRuleRequirementAction | null {
  if (rule.requirementAction) return rule.requirementAction;
  if (rule.trigger.type === 'focus_active') {
    return {
      kind: 'focus',
      label: 'Return to Focus',
      destination: 'kwilt://focus?source=screen-time',
    };
  }
  if (rule.trigger.type === 'real_step_pending') {
    return {
      kind: 'real_step',
      label: 'Do this first',
      destination: 'kwilt://today?source=screen-time&highlightSuggested=1',
    };
  }
  return null;
}

export function projectScreenTimeGuideActions(params: {
  actor: ScreenTimeActor;
  activeRules: ScreenTimeRule[];
  unresolvedCount?: number;
}): ScreenTimeGuideActions {
  const activeRules = params.activeRules.filter((rule) => rule.active);
  const unresolvedCount = Math.max(0, params.unresolvedCount ?? 0);
  const unauthorizedRules = activeRules.filter((rule) => !canActorManage(rule, params.actor));
  const actorCanOpenOverview = params.actor.kind === 'self_adult'
    || params.actor.kind === 'household_owner'
    || params.actor.kind === 'household_caregiver';
  const canManageRules = unauthorizedRules.length === 0
    && (activeRules.length > 0 ? activeRules.every((rule) => canActorManage(rule, params.actor)) : actorCanOpenOverview);
  const exactAction = activeRules.length === 1 && unresolvedCount === 0
    ? requirementActionForRule(activeRules[0])
    : null;
  const resolutionKind: ScreenTimeGuideActions['resolutionKind'] = unresolvedCount > 0
    ? 'unresolved'
    : activeRules.length > 1
      ? 'mixed'
      : exactAction
        ? 'actionable'
        : 'boundary';

  return {
    resolutionKind,
    requirementAction: canManageRules || activeRules[0]?.domain === 'personal'
      ? exactAction
      : null,
    canManageRules,
    requiresCaregiver: unauthorizedRules.some((rule) => rule.domain === 'family'),
  };
}
