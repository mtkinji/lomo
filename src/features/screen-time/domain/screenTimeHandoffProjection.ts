import type {
  ScreenTimeShieldHandoff,
  ScreenTimeShieldRestriction,
} from '../../../services/appleEcosystem/screenTimeProtection';
import {
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';
import type { ScreenTimeRule } from './screenTimeRule';
import type { PersonalCompositeScreenTimeRule } from './personalCompositeScreenTimeRule';
import { routeForScreenTimeShieldReason } from '../../../services/screenTimeShieldHandoff';

function projectRequirementAction(
  rule: PersonalCompositeScreenTimeRule,
): ScreenTimeRule['requirementAction'] {
  if (rule.conditions.length !== 1) return undefined;
  const condition = rule.conditions[0];
  if (condition.type === 'focus_active') {
    return {
      kind: 'focus',
      label: 'Return to Focus',
      destination: 'kwilt://focus?source=screen-time',
    };
  }
  if (condition.type === 'real_step_complete') {
    return {
      kind: 'real_step',
      label: 'Do this first',
      destination: 'kwilt://today?source=screen-time&highlightSuggested=1',
    };
  }
  if (condition.type === 'budget') {
    return {
      kind: 'money',
      label: 'Review Money',
      destination: `kwilt://money/category/${encodeURIComponent(condition.categorySourceId)}?source=screen-time`,
    };
  }
  return undefined;
}

function projectCompositeRule(rule: PersonalCompositeScreenTimeRule): ScreenTimeRule {
  const targets = [...rule.selectedApps, ...rule.selectedCategories];
  const first = targets[0]?.label?.trim();
  const title = first
    ? targets.length === 1 ? first : `${first} + ${targets.length - 1}`
    : `${targets.length} app${targets.length === 1 ? '' : 's'} or categories`;
  return {
    id: rule.id,
    domain: 'personal',
    subject: { kind: 'self' },
    selectionId: rule.selectionId,
    title,
    trigger: { type: 'composite' },
    requirementAction: projectRequirementAction(rule),
    temporaryOpen: { allowed: false, durationMinutes: 20 },
    active: rule.enabled,
    desiredVersion: 1,
    appliedVersion: null,
  };
}

function restrictionMatchesRule(restriction: ScreenTimeShieldRestriction, rule: ScreenTimeRule) {
  return restriction.ruleId === rule.id || restriction.selectionId === rule.selectionId;
}

export function routeForScreenTimeRuleRequirement(params: {
  ruleId: string | null;
  reason: string | null | undefined;
  personalSettings: ScreenTimeProtectionSettings;
}): string {
  const rule = params.ruleId
    ? params.personalSettings.personalCompositeRules.find((candidate) => candidate.id === params.ruleId)
    : null;
  const budget = rule?.conditions.find((condition) => condition.type === 'budget');
  if (budget?.type === 'budget') {
    return `kwilt://money/category/${encodeURIComponent(budget.categorySourceId)}?source=screen-time`;
  }
  return routeForScreenTimeShieldReason(params.reason);
}

export function projectRulesForScreenTimeHandoff(params: {
  handoff: ScreenTimeShieldHandoff;
  personalSettings: ScreenTimeProtectionSettings;
  familyRules?: ScreenTimeRule[];
}): { rules: ScreenTimeRule[]; unresolvedRestrictions: ScreenTimeShieldRestriction[] } {
  const personalRules = params.personalSettings.personalCompositeRules.map(projectCompositeRule);
  const candidates = [...personalRules, ...(params.familyRules ?? [])];
  const resolved: ScreenTimeRule[] = [];
  const unresolvedRestrictions: ScreenTimeShieldRestriction[] = [];

  params.handoff.restrictions.forEach((restriction) => {
    const rule = candidates.find((candidate) => restrictionMatchesRule(restriction, candidate));
    if (!rule) {
      unresolvedRestrictions.push(restriction);
      return;
    }
    if (!resolved.some((candidate) => candidate.id === rule.id)) {
      resolved.push({
        ...rule,
        active: true,
        ...(restriction.details.length > 0 ? { blockingDetails: restriction.details } : {}),
      });
    }
  });

  return { rules: resolved, unresolvedRestrictions };
}
