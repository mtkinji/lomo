import type {
  ScreenTimeShieldHandoff,
  ScreenTimeShieldRestriction,
} from '../../../services/appleEcosystem/screenTimeProtection';
import {
  projectPersonalScreenTimeRule,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';
import {
  moneyAppControlSelectionId,
  projectMoneyScreenTimeRule,
  type MoneyAppControlSettings,
} from '../../../capabilities/money/domain/moneyAppControl';
import type { ScreenTimeRule } from './screenTimeRule';

function restrictionMatchesRule(restriction: ScreenTimeShieldRestriction, rule: ScreenTimeRule) {
  return restriction.ruleId === rule.id || restriction.selectionId === rule.selectionId;
}

export function projectRulesForScreenTimeHandoff(params: {
  handoff: ScreenTimeShieldHandoff;
  personalSettings: ScreenTimeProtectionSettings;
  moneySettings: MoneyAppControlSettings;
  familyRules?: ScreenTimeRule[];
}): { rules: ScreenTimeRule[]; unresolvedRestrictions: ScreenTimeShieldRestriction[] } {
  const personalRules = params.personalSettings.personalRules.map(projectPersonalScreenTimeRule);
  const moneyRules = Object.entries(params.moneySettings.policies).flatMap(([categorySourceId, policy]) => {
    const matching = params.handoff.restrictions.find((restriction) => (
      restriction.selectionId === moneyAppControlSelectionId(categorySourceId)
    ));
    const rule = projectMoneyScreenTimeRule({
      categorySourceId,
      categoryName: matching?.label ?? categorySourceId,
      policy,
    });
    return rule ? [rule] : [];
  });
  const candidates = [...personalRules, ...moneyRules, ...(params.familyRules ?? [])];
  const resolved: ScreenTimeRule[] = [];
  const unresolvedRestrictions: ScreenTimeShieldRestriction[] = [];

  params.handoff.restrictions.forEach((restriction) => {
    const rule = candidates.find((candidate) => restrictionMatchesRule(restriction, candidate));
    if (!rule) {
      unresolvedRestrictions.push(restriction);
      return;
    }
    if (!resolved.some((candidate) => candidate.id === rule.id)) resolved.push({ ...rule, active: true });
  });

  return { rules: resolved, unresolvedRestrictions };
}
