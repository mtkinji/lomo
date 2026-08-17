import {
  getMoneyAppControlPresetCopy,
  hasMoneyAppControlTargets,
  moneyAppControlSelectionId,
  type MoneyAppControlSettings,
  type MoneyAppControlPreset,
} from '../../../capabilities/money/domain/moneyAppControl';
import {
  hasPersonalRuleTargets,
  type PersonalScreenTimeRuleKind,
  type ScreenTimeProtectionSettings,
} from '../../../services/screenTimeProtection';

export type ScreenTimeRuleInventoryRow = {
  id: string;
  domain: 'personal' | 'money';
  title: string;
  detail: string;
  targetCount: number;
  enabled: boolean;
  destination:
    | { kind: 'personal'; ruleKind: PersonalScreenTimeRuleKind }
    | { kind: 'money'; categorySourceId: string };
};

function targetLabel(count: number): string {
  return `${count} ${count === 1 ? 'app or category' : 'apps or categories'}`;
}

function readableCategoryName(categorySourceId: string): string {
  const words = categorySourceId.replace(/[_-]+/g, ' ').toLowerCase();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function moneyRuleTitle(preset: MoneyAppControlPreset, categoryName: string): string {
  if (preset === 'always_review') return `Review ${categoryName} before access`;
  if (preset === 'when_hot') return `Pause when ${categoryName} is hot`;
  if (preset === 'at_95_percent') return `Pause when ${categoryName} reaches 95%`;
  if (preset === 'when_over') return `Pause when ${categoryName} is over`;
  return `Pause when ${categoryName} needs review`;
}

function moneyRuleDetail(
  preset: MoneyAppControlPreset,
  categoryName: string,
  count: number,
): string {
  if (preset === 'always_review') {
    return `Pause ${targetLabel(count)} until ${categoryName} is reviewed.`;
  }
  const detail = getMoneyAppControlPresetCopy(preset).detail.replace(/^Pause\s+/i, '');
  return `Pause ${targetLabel(count)} ${detail.charAt(0).toLowerCase()}${detail.slice(1)}`;
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
      return {
        id: rule.id,
        domain: 'personal',
        title: focus ? 'Pause until Focus ends' : 'Unlock after a to-do, progress update, or Focus',
        detail: focus
          ? `Pause ${targetLabel(targetCount)} while Focus is running.`
          : `Unlock ${targetLabel(targetCount)} after you complete any one of these in Kwilt.`,
        targetCount,
        enabled: rule.enabled,
        destination: { kind: 'personal', ruleKind: rule.kind },
      };
    });

  const money = Object.entries(params.moneySettings.policies).flatMap(([categorySourceId, policy]) => {
    if (!hasMoneyAppControlTargets(policy)) return [];
    const categoryName = readableCategoryName(categorySourceId);
    const targetCount = policy.selectedApps.length + policy.selectedCategories.length;
    return [{
      id: moneyAppControlSelectionId(categorySourceId),
      domain: 'money' as const,
      title: moneyRuleTitle(policy.preset, categoryName),
      detail: moneyRuleDetail(policy.preset, categoryName, targetCount),
      targetCount,
      enabled: policy.enabled,
      destination: { kind: 'money' as const, categorySourceId },
    }];
  });

  return [...personal, ...money];
}
