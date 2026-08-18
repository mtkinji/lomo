import {
  hasMoneyAppControlTargets,
  moneyAppControlSelectionId,
  type MoneyAppControlSettings,
  type MoneyAppControlPreset,
} from '../../../capabilities/money/domain/moneyAppControl';
import {
  hasPersonalRuleTargets,
  type ScreenTimeToken,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';

export type ScreenTimeRuleInventoryRow = {
  id: string;
  domain: 'personal' | 'money';
  title: string;
  detail: string;
  targetCount: number;
  enabled: boolean;
  contextLabel: string | null;
  destination:
    | { kind: 'personal'; ruleId: string }
    | { kind: 'money'; categorySourceId: string };
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

function readableCategoryName(categorySourceId: string): string {
  const words = categorySourceId.replace(/[_-]+/g, ' ').toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function moneyRuleDetail(
  preset: MoneyAppControlPreset,
  categoryName: string,
): string {
  if (preset === 'always_review') return `Pause until ${categoryName} is reviewed.`;
  if (preset === 'when_hot') return `Pause when ${categoryName} spending runs ahead of the month.`;
  if (preset === 'at_95_percent') return `Pause when ${categoryName} reaches 95% of its plan.`;
  if (preset === 'when_over') return `Pause when ${categoryName} is over its monthly plan.`;
  return `Pause while ${categoryName} has transactions to review.`;
}

export function buildMyScreenTimeRuleInventory(params: {
  personalSettings: Pick<ScreenTimeProtectionSettings, 'personalRules'>;
  moneySettings: MoneyAppControlSettings;
}): ScreenTimeRuleInventoryRow[] {
  const personal = params.personalSettings.personalRules
    .filter(hasPersonalRuleTargets)
    .map((rule): ScreenTimeRuleInventoryRow => {
      const targetCount = rule.selectedApps.length + rule.selectedCategories.length;
      const focus = rule.kind === 'focus';
      const dailyLimit = rule.kind === 'daily_limit';
      return {
        id: rule.id,
        domain: 'personal',
        title: targetSummary(rule.selectedApps, rule.selectedCategories),
        detail: focus
          ? 'Pause while Focus is running.'
          : dailyLimit
            ? `Pause after ${rule.limitMinutes} minute${rule.limitMinutes === 1 ? '' : 's'} of use each day.`
            : 'Unlock after a to-do, progress update, or Focus.',
        targetCount,
        enabled: rule.enabled,
        contextLabel: null,
        destination: { kind: 'personal', ruleId: rule.id },
      };
    });

  const money = Object.entries(params.moneySettings.policies).flatMap(([categorySourceId, policy]) => {
    if (!hasMoneyAppControlTargets(policy)) return [];
    const categoryName = readableCategoryName(categorySourceId);
    const targetCount = policy.selectedApps.length + policy.selectedCategories.length;
    return [{
      id: moneyAppControlSelectionId(categorySourceId),
      domain: 'money' as const,
      title: targetSummary(policy.selectedApps, policy.selectedCategories),
      detail: moneyRuleDetail(policy.preset, categoryName),
      targetCount,
      enabled: policy.enabled,
      contextLabel: 'Money',
      destination: { kind: 'money' as const, categorySourceId },
    }];
  });

  return [...personal, ...money];
}
