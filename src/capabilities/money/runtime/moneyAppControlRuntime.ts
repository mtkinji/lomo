import {
  applyScreenTimeRestrictions,
  clearScreenTimeRestrictionsForSelection,
} from '../../../services/appleEcosystem/screenTimeProtection';
import type { MoneySnapshot } from '../data/moneySnapshot';
import {
  evaluateMoneyAppControlPolicy,
  moneyAppControlSelectionId,
  type MoneyAppControlSettings,
} from '../domain/moneyAppControl';
import { loadMoneyAppControlSettings } from './moneyAppControlStorage';

export async function reconcileMoneyAppControls(
  snapshot: MoneySnapshot,
  suppliedSettings?: MoneyAppControlSettings,
): Promise<void> {
  const settings = suppliedSettings ?? await loadMoneyAppControlSettings();
  await Promise.all(snapshot.categories.map(async (category) => {
    const policy = settings.policies[category.sourceId];
    const selectionId = moneyAppControlSelectionId(category.sourceId);
    const evaluation = evaluateMoneyAppControlPolicy({ settings, snapshot, category, now: new Date() });
    if (!evaluation.restricted || !policy) {
      await clearScreenTimeRestrictionsForSelection(selectionId);
      return;
    }
    await applyScreenTimeRestrictions({
      settings: {
        selectedApps: policy.selectedApps,
        selectedCategories: policy.selectedCategories,
      },
      reasons: [evaluation.reason!],
      selectionId,
      reason: evaluation.reason!,
      restrictionLabel: category.name,
    });
  }));
}
