import {
  type ScreenTimeToken,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';
import type {
  PersonalCompositeScreenTimeRule,
  PersonalRuleCondition,
} from './personalCompositeScreenTimeRule';
import { personalCompositeConditionRulePhrase } from './personalCompositeRuleExplanation';

export type ScreenTimeRuleInventoryRow = {
  id: string;
  domain: 'personal';
  title: string;
  detail: string;
  targetCount: number;
  enabled: boolean;
  contextLabel: string | null;
  destination: { kind: 'personal'; ruleId: string };
};

function targetLabel(count: number): string {
  return `${count} ${count === 1 ? 'app or category' : 'apps or categories'}`;
}

function targetSummary(selectedApps: ScreenTimeToken[], selectedCategories: ScreenTimeToken[]): string {
  const targets = [...selectedApps, ...selectedCategories];
  const firstLabel = targets[0]?.label?.trim();
  if (targets.length === 1) return firstLabel || targetLabel(1);
  return firstLabel ? `${firstLabel} + ${targets.length - 1}` : targetLabel(targets.length);
}

export function personalCompositeConditionLabel(condition: PersonalRuleCondition): string {
  return personalCompositeConditionRulePhrase(condition);
}

export function personalCompositeRuleDetail(rule: PersonalCompositeScreenTimeRule): string {
  const connector = rule.connector === 'all' ? ' and ' : ' or ';
  const conditions = rule.conditions.map(personalCompositeConditionLabel).join(connector);
  const sentence = `${rule.outcome === 'available' ? 'Available' : 'Pause'} ${conditions}.`;
  return sentence.replace(/\.\.$/, '.');
}

export function buildMyScreenTimeRuleInventory(params: {
  personalSettings: Pick<ScreenTimeProtectionSettings, 'personalCompositeRules'>;
}): ScreenTimeRuleInventoryRow[] {
  return params.personalSettings.personalCompositeRules.map((rule): ScreenTimeRuleInventoryRow => {
    const targetCount = rule.selectedApps.length + rule.selectedCategories.length;
    const contextLabel = rule.monetizationState === 'deactivation_pending'
      ? 'Deactivation pending'
      : rule.monetizationState === 'inactive_subscription_ended'
        ? 'Inactive — Pro ended'
        : null;
    return {
      id: rule.id,
      domain: 'personal',
      title: personalCompositeRuleDetail(rule).replace(/\.$/, ''),
      detail: targetSummary(rule.selectedApps, rule.selectedCategories),
      targetCount,
      enabled: rule.enabled,
      contextLabel,
      destination: { kind: 'personal', ruleId: rule.id },
    };
  }).filter((row) => row.targetCount > 0);
}
