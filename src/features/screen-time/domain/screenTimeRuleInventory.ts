import {
  type ScreenTimeToken,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';
import type {
  PersonalCompositeScreenTimeRule,
  PersonalRuleCondition,
} from './personalCompositeScreenTimeRule';

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

function moneyRuleDetail(
  preset: Extract<PersonalRuleCondition, { type: 'budget' }>['preset'],
  categoryName: string,
): string {
  if (preset === 'always_review') return `Pause until ${categoryName} is reviewed.`;
  if (preset === 'when_hot') return `Pause when ${categoryName} spending runs ahead of the month.`;
  if (preset === 'at_95_percent') return `Pause when ${categoryName} reaches 95% of its plan.`;
  if (preset === 'when_over') return `Pause when ${categoryName} is over its monthly plan.`;
  return `Pause while ${categoryName} has transactions to review.`;
}

function timeLabel(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

export function personalCompositeConditionLabel(condition: PersonalRuleCondition): string {
  if (condition.type === 'real_step_complete') return 'after a to-do, progress update, or Focus';
  if (condition.type === 'focus_active') return condition.operator === 'is' ? 'while Focus is active' : 'while Focus is not active';
  if (condition.type === 'daily_usage') {
    return condition.operator === 'below'
      ? `while daily use is under ${condition.minutes} minute${condition.minutes === 1 ? '' : 's'}`
      : `when daily use reaches ${condition.minutes} minute${condition.minutes === 1 ? '' : 's'}`;
  }
  if (condition.type === 'budget') return moneyRuleDetail(condition.preset, condition.categoryName).replace(/^Pause\s+/i, '').replace(/\.$/, '');
  return `${condition.operator === 'before' ? 'before' : 'after'} ${timeLabel(condition.minuteOfDay)}`;
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
    return {
      id: rule.id,
      domain: 'personal',
      title: targetSummary(rule.selectedApps, rule.selectedCategories),
      detail: personalCompositeRuleDetail(rule),
      targetCount,
      enabled: rule.enabled,
      contextLabel: null,
      destination: { kind: 'personal', ruleId: rule.id },
    };
  }).filter((row) => row.targetCount > 0);
}
